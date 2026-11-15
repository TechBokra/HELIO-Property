-- =========================================================================
-- MIGRATION: 20261009_phase3b_security_verification.sql
-- PURPOSE: Forward-only hardening for Phase 3B RLS and Operations Security
--          1. Enforce database-level isolation of internal operational notes (request_messages)
--             so partners and customers can never read internal notes by direct query or ID parameter.
--          2. Prevent unauthorized request reassignment, payload.partnerId hijacking, or
--             ineligible assignee binding on direct Supabase INSERT/UPDATE requests.
--          3. Re-affirm immutable RLS enforcement on public.credential_audit_log.
-- =========================================================================

-- 1. ISOLATE INTERNAL OPERATIONAL NOTES IN REQUEST_MESSAGES
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- Hardened SELECT for assigned active partners: STRICTLY restricts to public customer-partner 'message' type.
-- Internal operational notes (type = 'note', 'internal_note', etc.) cannot be read by partners.
DROP POLICY IF EXISTS "Assigned partners view messages for assigned requests" ON public.request_messages;
CREATE POLICY "Assigned partners view messages for assigned requests" 
ON public.request_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
    AND EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId') = auth.uid()::text
        )
    )
    AND request_messages.type = 'message'
);

-- Assigned active partners can only insert messages of type 'message' as sender 'partner'
DROP POLICY IF EXISTS "Assigned partners insert messages for assigned requests" ON public.request_messages;
CREATE POLICY "Assigned partners insert messages for assigned requests" 
ON public.request_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
    AND EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId') = auth.uid()::text
        )
    )
    AND request_messages.sender = 'partner'
    AND request_messages.type = 'message'
);

-- Customers can only read messages of type 'message' (never internal notes) for their own requests
DROP POLICY IF EXISTS "Customers view messages for own requests" ON public.request_messages;
CREATE POLICY "Customers view messages for own requests" 
ON public.request_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.type = 'message'
);

-- Customers can only insert messages of type 'message' as sender 'client'
DROP POLICY IF EXISTS "Customers insert messages for own requests" ON public.request_messages;
CREATE POLICY "Customers insert messages for own requests" 
ON public.request_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.sender = 'client'
    AND request_messages.type = 'message'
);

-- Active internal operational staff only (never suspended/disabled staff)
DROP POLICY IF EXISTS "Admins and managers view and insert all request messages" ON public.request_messages;
CREATE POLICY "Admins and managers view and insert all request messages" 
ON public.request_messages FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND p.role IN (
            'super_admin', 'platform_finishing_manager', 'finishing_market_manager',
            'decoration_manager', 'listings_manager', 'platform_real_estate_manager',
            'real_estate_market_manager', 'partner_relations_manager',
            'customer_relations_manager', 'service_manager'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND p.role IN (
            'super_admin', 'platform_finishing_manager', 'finishing_market_manager',
            'decoration_manager', 'listings_manager', 'platform_real_estate_manager',
            'real_estate_market_manager', 'partner_relations_manager',
            'customer_relations_manager', 'service_manager'
        )
    )
);

-- 2. HARDEN PARTNER ISOLATION & ADMIN SCOPING ON PUBLIC.REQUESTS
DROP POLICY IF EXISTS "Assigned partners can view their requests" ON public.requests;
CREATE POLICY "Assigned partners can view their requests" 
ON public.requests FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
    AND (
        auth.uid() = assigned_to 
        OR (payload->>'partnerId') = auth.uid()::text
    )
);

-- Partners can only update status/domain fields on their own assigned requests.
-- They CANNOT change assigned_to or payload->>'partnerId' to reassign or hijack requests.
DROP POLICY IF EXISTS "Assigned partners can update their requests" ON public.requests;
CREATE POLICY "Assigned partners can update their requests" 
ON public.requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
    AND (
        auth.uid() = assigned_to 
        OR (payload->>'partnerId') = auth.uid()::text
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
    AND (
        auth.uid() = assigned_to 
        OR (payload->>'partnerId') = auth.uid()::text
    )
    AND requests.assigned_to IS NOT DISTINCT FROM (
        SELECT r.assigned_to FROM public.requests r WHERE r.id = requests.id
    )
    AND (requests.payload->>'partnerId') IS NOT DISTINCT FROM (
        SELECT r.payload->>'partnerId' FROM public.requests r WHERE r.id = requests.id
    )
);

-- Require active status for administrative / domain-scoped manager request access
DROP POLICY IF EXISTS "Admins and managers manage requests" ON public.requests;
CREATE POLICY "Admins and managers manage requests" 
ON public.requests FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (
            p.role = 'super_admin'
            OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND (
                (requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                    OR requests.payload->>'category' = 'turnkey'
                    OR requests.payload->>'serviceTitle' ILIKE '%تشطيب%'
                    OR requests.payload->>'serviceTitle' ILIKE '%finishing%'
                ))
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role = 'decoration_manager' AND (
                (requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('decorations', 'decoration')
                    OR requests.payload->>'serviceTitle' ILIKE '%ديكور%'
                    OR requests.payload->>'serviceTitle' ILIKE '%decor%'
                ))
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND (
                requests.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                OR (requests.type = 'LEAD' AND (requests.payload->>'serviceType' IN ('property', 'property_search') OR requests.payload->>'propertyId' IS NOT NULL))
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role = 'partner_relations_manager' AND (
                requests.type = 'PARTNER_APPLICATION'
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role IN ('customer_relations_manager', 'service_manager') AND (
                requests.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                OR requests.assigned_to = auth.uid()
            ))
        )
    )
);

-- 3. DB-LEVEL ENFORCEMENT OF ASSIGNMENT AUTHORIZATION & ASSIGNEE ELIGIBILITY
CREATE OR REPLACE FUNCTION public.protect_request_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_is_operational_staff BOOLEAN := FALSE;
    v_assignee_role TEXT;
    v_assignee_type TEXT;
    v_assignee_status TEXT;
    v_service_type TEXT;
    v_category TEXT;
BEGIN
    -- Determine caller authority when running in an authenticated user context
    IF v_caller_id IS NOT NULL THEN
        SELECT role::text, status::text
        INTO v_caller_role, v_caller_status
        FROM public.partners
        WHERE id = v_caller_id;

        v_is_operational_staff := (v_caller_status = 'active') AND (
            v_caller_role = 'super_admin'
            OR v_caller_role IN (
                'partner_relations_manager',
                'platform_finishing_manager',
                'finishing_market_manager',
                'decoration_manager',
                'listings_manager',
                'platform_real_estate_manager',
                'real_estate_market_manager',
                'customer_relations_manager',
                'service_manager'
            )
        );
    END IF;

    -- On UPDATE, enforce non-staff field restrictions and reject direct reassignment attempts
    IF TG_OP = 'UPDATE' AND v_caller_id IS NOT NULL AND NOT v_is_operational_staff THEN
        IF NEW.customer_id IS DISTINCT FROM OLD.customer_id AND OLD.customer_id IS NOT NULL THEN
            NEW.customer_id := OLD.customer_id;
        END IF;

        IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
            RAISE EXCEPTION 'Unauthorized: only active authorized platform staff may assign or reassign requests.';
        END IF;

        IF (NEW.payload->>'partnerId') IS DISTINCT FROM (OLD.payload->>'partnerId') THEN
            RAISE EXCEPTION 'Unauthorized: only active authorized platform staff may modify partner assignment.';
        END IF;
    END IF;

    -- Validate assignee eligibility whenever assigned_to is set on INSERT or changed on UPDATE
    IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
        SELECT role::text, type, status::text
        INTO v_assignee_role, v_assignee_type, v_assignee_status
        FROM public.partners
        WHERE id = NEW.assigned_to;

        IF NOT FOUND OR v_assignee_status <> 'active' THEN
            RAISE EXCEPTION 'Ineligible assignee: target account does not exist or is not active.';
        END IF;

        IF v_assignee_role IN ('customer', 'content_manager') THEN
            RAISE EXCEPTION 'Ineligible assignee: role % cannot be assigned requests.', v_assignee_role;
        END IF;

        -- Super Admin is eligible for all request domains
        IF v_assignee_role <> 'super_admin' THEN
            v_service_type := LOWER(COALESCE(NEW.payload->>'serviceType', ''));
            v_category := LOWER(COALESCE(NEW.payload->>'category', ''));

            IF NEW.type::text = 'PARTNER_APPLICATION' THEN
                IF v_assignee_role <> 'partner_relations_manager' THEN
                    RAISE EXCEPTION 'Ineligible assignee: partner applications require partner_relations_manager or super_admin.';
                END IF;
            ELSIF NEW.type::text IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY') THEN
                IF v_assignee_role NOT IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager', 'developer_partner', 'agency_partner') THEN
                    RAISE EXCEPTION 'Ineligible assignee: real estate requests require a real estate manager or eligible real estate partner.';
                END IF;
            ELSIF v_service_type = 'finishing' OR v_category = 'turnkey' THEN
                IF v_assignee_role NOT IN ('platform_finishing_manager', 'finishing_market_manager', 'finishing_partner') THEN
                    RAISE EXCEPTION 'Ineligible assignee: finishing requests require a finishing manager or active finishing partner.';
                END IF;
            ELSIF v_service_type IN ('decorations', 'decoration') THEN
                IF v_assignee_role NOT IN ('decoration_manager', 'service_manager') AND LOWER(COALESCE(v_assignee_type, '')) <> 'decoration' THEN
                    RAISE EXCEPTION 'Ineligible assignee: decoration requests require decoration_manager or service_manager.';
                END IF;
            ELSIF NEW.type::text = 'CONTACT_MESSAGE' THEN
                IF v_assignee_role NOT IN ('customer_relations_manager', 'service_manager') THEN
                    RAISE EXCEPTION 'Ineligible assignee: contact messages require customer_relations_manager or service_manager.';
                END IF;
            ELSE
                IF v_assignee_role NOT LIKE '%_manager' AND v_assignee_role NOT IN ('developer_partner', 'agency_partner', 'finishing_partner') THEN
                    RAISE EXCEPTION 'Ineligible assignee: role % does not match request domain.', v_assignee_role;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_request_privileged_fields ON public.requests;
CREATE TRIGGER trigger_protect_request_privileged_fields
BEFORE INSERT OR UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.protect_request_privileged_fields();

-- 4. AFFIRM IMMUTABLE RLS ON CREDENTIAL_AUDIT_LOG
ALTER TABLE public.credential_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny client insert on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client insert on credential_audit_log" 
ON public.credential_audit_log FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client update on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client update on credential_audit_log" 
ON public.credential_audit_log FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Deny client delete on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client delete on credential_audit_log" 
ON public.credential_audit_log FOR DELETE USING (false);
