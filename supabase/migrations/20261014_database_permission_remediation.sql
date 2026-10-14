-- =========================================================================
-- MIGRATION: 20261014_database_permission_remediation.sql
-- PURPOSE: Production Database Permission Remediation & Hardening for
--          public.requests and public.request_messages
--
-- REMEDIATION TARGETS:
-- 1. Table Grants & Privilege Hardening:
--    - Revoke TRUNCATE, DELETE, and UPDATE from anon and standard client roles.
--    - Ensure anon can only INSERT into public.requests for public intake.
--    - Revoke all direct privileges on public.request_messages from anon.
-- 2. Initial Intake Tracking Trigger:
--    - Move system intake note generation to a SECURITY DEFINER trigger
--      on public.requests, eliminating any requirement for anon to insert into
--      public.request_messages.
-- 3. Eliminate Permissive Policy OR Bleed:
--    - Drop "Public can insert request_messages" with WITH CHECK (true).
-- 4. Enforce Strict Partner Isolation:
--    - Constrain partner message SELECT strictly to type = 'message'.
--    - Constrain partner message INSERT strictly to sender = 'partner' AND type = 'message'.
--    - Constrain partner UPDATE on requests to prevent altering assigned_to,
--      customer_id, or request type.
-- 5. Preserve Legitimate Workflows:
--    - Public anonymous inquiry/lead submission.
--    - Authenticated customer request tracking & conversation threads.
--    - Authenticated partner lead updates & conversation threads.
--    - Authorized internal staff domain-scoped triage, internal notes, and management.
-- 6. Ensure Missing Audit Tables Are Safely Initialized (Idempotent):
--    - public.request_history and public.credential_audit_log.
-- =========================================================================

-- -------------------------------------------------------------------------
-- STEP 1: SAFE IDEMPOTENT CREATION OF AUDIT TABLES (IF MISSING ON TARGET)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID,
    actor_name TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    old_assigned_to UUID,
    new_assigned_to UUID,
    metadata JSONB DEFAULT '{}',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_request_history_req ON public.request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_request_history_created ON public.request_history(created_at DESC);

ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.credential_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN (
        'PASSWORD_RESET_INITIATED',
        'PASSWORD_RESET_COMPLETED',
        'PASSWORD_RESET_EMAIL_SENT'
    )),
    success BOOLEAN NOT NULL DEFAULT true,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_credential_audit_actor ON public.credential_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_target ON public.credential_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_created ON public.credential_audit_log(created_at DESC);

ALTER TABLE public.credential_audit_log ENABLE ROW LEVEL SECURITY;

-- Deny client modifications on credential_audit_log (immutable table)
DROP POLICY IF EXISTS "Deny client insert on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client insert on credential_audit_log" 
ON public.credential_audit_log FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client update on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client update on credential_audit_log" 
ON public.credential_audit_log FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Deny client delete on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client delete on credential_audit_log" 
ON public.credential_audit_log FOR DELETE USING (false);

DROP POLICY IF EXISTS "Authorized users view credential audit log" ON public.credential_audit_log;
CREATE POLICY "Authorized users view credential audit log" 
ON public.credential_audit_log FOR SELECT 
USING (
    target_user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (
            p.role = 'super_admin' 
            OR 'view_audit_log' = ANY(p.custom_permissions)
            OR 'manage_user_credentials' = ANY(p.custom_permissions)
        )
    )
);

-- -------------------------------------------------------------------------
-- STEP 2: TABLE-LEVEL PRIVILEGE REMEDIATION (LEAST-PRIVILEGE GRANTS)
-- -------------------------------------------------------------------------

-- Revoke all blanket privileges from anon and authenticated on core tables
REVOKE ALL ON TABLE public.requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.request_messages FROM anon, authenticated;
REVOKE ALL ON TABLE public.request_history FROM anon, authenticated;
REVOKE ALL ON TABLE public.credential_audit_log FROM anon, authenticated;

-- Explicitly ensure TRUNCATE is revoked from public
REVOKE TRUNCATE ON TABLE public.requests FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE ON TABLE public.request_messages FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE ON TABLE public.request_history FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE ON TABLE public.credential_audit_log FROM PUBLIC, anon, authenticated;

-- Grant least-privilege operations to anon
-- anon only needs INSERT on requests for public intake forms
GRANT INSERT ON TABLE public.requests TO anon;

-- Grant least-privilege operations to authenticated
-- authenticated users (customers, partners, staff) need SELECT, INSERT, UPDATE on requests
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.requests TO authenticated;

-- authenticated users need SELECT, INSERT on request_messages (UPDATE revoked: messages are append-only)
GRANT SELECT, INSERT, DELETE ON TABLE public.request_messages TO authenticated;

-- authenticated users can read request_history according to RLS (writes happen strictly via triggers/service_role)
GRANT SELECT ON TABLE public.request_history TO authenticated;

-- authenticated users can read credential_audit_log according to RLS (writes happen strictly via service_role)
GRANT SELECT ON TABLE public.credential_audit_log TO authenticated;

-- -------------------------------------------------------------------------
-- STEP 3: AUTOMATIC SERVER-SIDE INTAKE NOTE TRIGGER (ELIMINATES ANON MESSAGE INSERT)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_request_initial_intake_note()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.request_messages (
        request_id,
        sender,
        type,
        content,
        created_at
    ) VALUES (
        NEW.id,
        'system',
        'note',
        '[INTAKE] New ' || NEW.type::text || ' received from ' || COALESCE(NEW.requester_name, 'Anonymous') || '. Assigned to: ' || COALESCE(NEW.assigned_to::text, 'Unassigned') || '.',
        timezone('utc'::text, now())
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback non-blocking so client request intake insert never aborts
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_request_initial_intake_note ON public.requests;
CREATE TRIGGER trigger_request_initial_intake_note
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_request_initial_intake_note();

-- -------------------------------------------------------------------------
-- STEP 4: PRIVILEGED FIELD PROTECTION TRIGGER (BEFORE UPDATE ON REQUESTS)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_request_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_staff BOOLEAN := FALSE;
BEGIN
    IF v_caller_id IS NULL THEN
        -- Allow internal server-side functions and triggers
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = v_caller_id 
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    ) INTO v_is_staff;

    IF v_is_staff THEN
        RETURN NEW;
    END IF;

    -- Non-staff cannot change customer_id
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id AND OLD.customer_id IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized: only staff can modify customer identity';
    END IF;

    -- Non-staff cannot modify request type
    IF NEW.type IS DISTINCT FROM OLD.type THEN
        RAISE EXCEPTION 'Unauthorized: request type cannot be altered';
    END IF;

    -- Non-staff cannot reassign assigned_to
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
        RAISE EXCEPTION 'Unauthorized: only authorized staff can reassign requests';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_request_privileged_fields ON public.requests;
CREATE TRIGGER trigger_protect_request_privileged_fields
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.protect_request_privileged_fields();

-- -------------------------------------------------------------------------
-- STEP 5: DROP VULNERABLE & CONFLICTING POLICIES (ELIMINATE PERMISSIVE OR BLEED)
-- -------------------------------------------------------------------------

-- Drop permissive public insert policy that neutralized all message validation
DROP POLICY IF EXISTS "Public can insert request_messages" ON public.request_messages;
DROP POLICY IF EXISTS "Anyone can insert request_messages" ON public.request_messages;

-- Drop prior request_messages policies
DROP POLICY IF EXISTS "Customers view messages for own requests" ON public.request_messages;
DROP POLICY IF EXISTS "Customers insert messages for own requests" ON public.request_messages;
DROP POLICY IF EXISTS "Assigned partners view messages for assigned requests" ON public.request_messages;
DROP POLICY IF EXISTS "Assigned partners insert messages for assigned requests" ON public.request_messages;
DROP POLICY IF EXISTS "Admins and managers view and insert all request messages" ON public.request_messages;
DROP POLICY IF EXISTS "Staff view all messages and internal notes" ON public.request_messages;
DROP POLICY IF EXISTS "Staff insert messages and internal notes" ON public.request_messages;
DROP POLICY IF EXISTS "Super admins delete request messages" ON public.request_messages;

-- Drop prior requests policies
DROP POLICY IF EXISTS "Anyone can create a request or inquiry" ON public.requests;
DROP POLICY IF EXISTS "Public and authenticated users can create requests" ON public.requests;
DROP POLICY IF EXISTS "Customers view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Customers view own requests" ON public.requests;
DROP POLICY IF EXISTS "Customers update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Customers update own requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners can view their requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners view assigned requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners can update their requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners update assigned requests" ON public.requests;
DROP POLICY IF EXISTS "Admins and managers manage requests" ON public.requests;
DROP POLICY IF EXISTS "Staff view domain-scoped requests" ON public.requests;
DROP POLICY IF EXISTS "Staff update requests" ON public.requests;
DROP POLICY IF EXISTS "Super admins delete requests" ON public.requests;

-- -------------------------------------------------------------------------
-- STEP 6: ENABLE AND ENFORCE ROW LEVEL SECURITY
-- -------------------------------------------------------------------------

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests FORCE ROW LEVEL SECURITY;

ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_messages FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- STEP 7: RE-CREATE HARDENED RLS POLICIES FOR PUBLIC.REQUESTS
-- -------------------------------------------------------------------------

-- 1. INSERT: Anon and Authenticated can submit new intake requests
CREATE POLICY "Public and authenticated users can create requests" 
ON public.requests FOR INSERT 
WITH CHECK (
    status IS NULL OR status IN ('new', 'pending')
);

-- 2. SELECT: Authenticated Customers (Own requests only)
CREATE POLICY "Customers view own requests" 
ON public.requests FOR SELECT 
USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
);

-- 3. SELECT: Authenticated Partners (Assigned requests only)
CREATE POLICY "Assigned partners view assigned requests" 
ON public.requests FOR SELECT 
USING (
    assigned_to = auth.uid() 
    OR (payload->>'partnerId')::uuid = auth.uid()
);

-- 4. SELECT: Internal Staff (Domain-scoped visibility)
CREATE POLICY "Staff view domain-scoped requests" 
ON public.requests FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (
            p.role = 'super_admin'
            OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND (
                requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                    OR requests.payload->>'category' = 'turnkey'
                    OR requests.payload->>'serviceTitle' ILIKE '%تشطيب%'
                    OR requests.payload->>'serviceTitle' ILIKE '%finishing%'
                )
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role = 'decoration_manager' AND (
                requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('decorations', 'decoration')
                    OR requests.payload->>'serviceTitle' ILIKE '%ديكور%'
                    OR requests.payload->>'serviceTitle' ILIKE '%decor%'
                )
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND (
                requests.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                OR (requests.type = 'LEAD' AND (requests.payload->>'serviceType' = 'property' OR requests.payload->>'propertyId' IS NOT NULL))
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

-- 5. UPDATE: Authenticated Customers (Own requests, cannot reassign)
CREATE POLICY "Customers update own requests" 
ON public.requests FOR UPDATE 
USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
)
WITH CHECK (
    (
        (customer_id IS NOT NULL AND customer_id = auth.uid())
        OR requester_email = auth.jwt()->>'email'
        OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
    )
);

-- 6. UPDATE: Authenticated Partners (Assigned requests, cannot reassign or steal)
CREATE POLICY "Assigned partners update assigned requests" 
ON public.requests FOR UPDATE 
USING (
    assigned_to = auth.uid() 
    OR (payload->>'partnerId')::uuid = auth.uid()
)
WITH CHECK (
    -- Must remain assigned to the same partner
    requests.assigned_to = auth.uid()
    OR (requests.payload->>'partnerId')::uuid = auth.uid()
);

-- 7. UPDATE: Internal Staff (Triage, assignment, status management)
CREATE POLICY "Staff update requests" 
ON public.requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
);

-- 8. DELETE: Super Admins only
CREATE POLICY "Super admins delete requests" 
ON public.requests FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND p.role = 'super_admin'
    )
);

-- -------------------------------------------------------------------------
-- STEP 8: RE-CREATE HARDENED RLS POLICIES FOR PUBLIC.REQUEST_MESSAGES
-- -------------------------------------------------------------------------

-- 1. SELECT: Customers (Own requests, STRICTLY ordinary messages only)
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

-- 2. SELECT: Assigned Partners (Assigned requests, STRICTLY ordinary messages only)
-- Internal operational notes ('note') are strictly isolated from partners
CREATE POLICY "Assigned partners view messages for assigned requests" 
ON public.request_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid()
        )
    )
    AND request_messages.type = 'message'
);

-- 3. SELECT: Internal Staff (All messages and internal notes)
CREATE POLICY "Staff view all messages and internal notes" 
ON public.request_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
);

-- 4. INSERT: Customers (Own requests, sender='client', type='message')
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

-- 5. INSERT: Assigned Partners (Assigned requests, sender='partner', type='message')
CREATE POLICY "Assigned partners insert messages for assigned requests" 
ON public.request_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid()
        )
    )
    AND request_messages.sender = 'partner'
    AND request_messages.type = 'message'
);

-- 6. INSERT: Internal Staff (Can post messages or internal operational notes)
CREATE POLICY "Staff insert messages and internal notes" 
ON public.request_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
    AND request_messages.sender IN ('admin', 'system')
    AND request_messages.type IN ('message', 'note')
);

-- 7. DELETE: Super Admins only
CREATE POLICY "Super admins delete request messages" 
ON public.request_messages FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND p.role = 'super_admin'
    )
);
