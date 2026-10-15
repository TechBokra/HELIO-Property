-- =========================================================================
-- MIGRATION: 20261014_database_permission_remediation.sql
-- PURPOSE: Production Database Permission Remediation & Hardening for
--          public.requests, public.request_messages, public.request_history,
--          and public.credential_audit_log
--
-- REVISION SUMMARY (Pre-Production Corrections):
-- 1. Existing Policy Cleanup:
--    Explicitly drops all observed production policies, including:
--    - "Admins have full access to request messages"
--    - "Partners insert messages for assigned requests"
--    - "Partners read messages for assigned requests"
--    - "Public can insert request_messages"
--    - "Admins can view all requests"
--    - "Partners manage assigned requests"
--    - "Partners update assigned requests"
--    - "Public can insert requests"
--    alongside all earlier historical policy names to eliminate permissive OR bypasses.
--
-- 2. Least-Privilege Grants:
--    - Completely revokes TRUNCATE from PUBLIC, anon, and authenticated.
--    - Revokes direct privileges from PUBLIC and anon on request_messages,
--      request_history, and credential_audit_log.
--    - anon: strictly INSERT on public.requests (for intake forms).
--    - authenticated: SELECT, INSERT, UPDATE, DELETE on requests (governed by RLS).
--    - authenticated: SELECT, INSERT, DELETE on request_messages (UPDATE revoked; append-only).
--    - authenticated: SELECT only on request_history and credential_audit_log.
--
-- 3. Request Identity Protection:
--    - Corrected protect_request_privileged_fields() BEFORE UPDATE trigger:
--      * Non-staff callers (including anonymous visitors, customers, and partners)
--        CANNOT set or modify customer_id, assigned_to, type, id, or created_at,
--        EVEN WHEN the old value was NULL.
--      * No early return when auth.uid() IS NULL (which would bypass checks for anon).
--      * Authoritative staff check against active partners with super_admin or %_manager.
--      * Relies strictly on auth.role() = 'service_role' and verified staff credentials,
--        never trusting current_user inside SECURITY DEFINER contexts.
--    - Corrected set_request_customer_identity() BEFORE INSERT trigger:
--      * Forces customer_id to auth.uid() for authenticated customers.
--      * Forces customer_id to NULL for anonymous users to prevent forgery.
--
-- 4. Request History Table & Event-Writing Mechanism:
--    - Ensures public.request_history exists.
--    - Audit Integrity: request_id REFERENCES public.requests(id) ON DELETE SET NULL (nullable),
--      ensuring deleting a request NEVER cascade-deletes or destroys historical audit records.
--    - Re-attaches trg_log_request_mutation() trigger on INSERT, UPDATE, and DELETE.
--    - Adds explicit domain-scoped SELECT RLS policies for staff, partners, and customers.
--    - Explicitly prohibits client INSERT, UPDATE, DELETE (append-only trigger-driven audit log).
--
-- 5. Credential Audit Log Schema & RLS:
--    - Verified against /api/admin/credentials and serverClient service_role implementation.
--    - Immutable audit log: client INSERT, UPDATE, DELETE blocked.
--    - Target users can view their own audit logs; authorized staff can view logs.
--
-- 6. Trigger & FORCE RLS Safety:
--    - Explicitly sets NO FORCE ROW LEVEL SECURITY. FORCE RLS is unsafe because it
--      forces RLS evaluation on table owners (postgres), breaking SECURITY DEFINER
--      triggers executed during unauthenticated (anon) intake. Standard ENABLE RLS
--      is completely safe and enforces RLS on anon and authenticated.
--    - Removed all non-blocking EXCEPTION WHEN OTHERS handlers that silently swallow
--      security failures. All triggers execute strictly and report failures.
--    - All functions have SECURITY DEFINER SET search_path = public, pg_temp.
-- =========================================================================

-- -------------------------------------------------------------------------
-- STEP 1: SAFE IDEMPOTENT CREATION & ADJUSTMENT OF AUDIT TABLES
-- -------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1.1 request_history
CREATE TABLE IF NOT EXISTS public.request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    actor_id UUID,
    actor_name TEXT NOT NULL DEFAULT 'System',
    actor_role TEXT,
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    old_assigned_to UUID,
    new_assigned_to UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Audit Integrity: ensure request_id is nullable and foreign key uses ON DELETE SET NULL
-- Deleting a request entity must NEVER cascade-delete its historical audit records.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Ensure request_id is nullable (safe and idempotent in PostgreSQL)
    ALTER TABLE public.request_history ALTER COLUMN request_id DROP NOT NULL;

    -- Drop any existing foreign key constraint on request_history(request_id)
    FOR r IN (
        SELECT con.conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'request_history'
          AND con.contype = 'f'
          AND ARRAY['request_id'::name] <@ (
              SELECT array_agg(attname ORDER BY attnum)
              FROM pg_attribute
              WHERE attrelid = rel.oid AND attnum = ANY(con.conkey)
          )
    ) LOOP
        EXECUTE 'ALTER TABLE public.request_history DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;

    -- Add the constraint with ON DELETE SET NULL
    ALTER TABLE public.request_history 
        ADD CONSTRAINT request_history_request_id_fkey 
        FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN
        -- Only ignore if the constraint with this exact name already exists
        NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_request_history_req ON public.request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_request_history_created ON public.request_history(created_at DESC);

-- 1.2 credential_audit_log
-- Matches /api/admin/credentials implementation fields:
-- actor_user_id, target_user_id, action, success, details, created_at
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

-- -------------------------------------------------------------------------
-- STEP 2: TABLE-LEVEL PRIVILEGE REMEDIATION (LEAST-PRIVILEGE GRANTS)
-- -------------------------------------------------------------------------

-- Revoke all privileges from PUBLIC, anon, and authenticated
REVOKE ALL ON TABLE public.requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.request_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.request_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.credential_audit_log FROM PUBLIC, anon, authenticated;

-- Explicitly revoke TRUNCATE from PUBLIC and all client roles
REVOKE TRUNCATE ON TABLE public.requests FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE ON TABLE public.request_messages FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE ON TABLE public.request_history FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE ON TABLE public.credential_audit_log FROM PUBLIC, anon, authenticated;

-- 1. public.requests:
-- anon: ONLY INSERT (for public inquiry / lead intake forms)
GRANT INSERT ON TABLE public.requests TO anon;

-- authenticated: SELECT, INSERT, UPDATE, DELETE (governed by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.requests TO authenticated;

-- 2. public.request_messages:
-- anon: NO PRIVILEGES (all initial intake notes created via trigger)
-- authenticated: SELECT, INSERT, DELETE (UPDATE revoked; messages are append-only)
GRANT SELECT, INSERT, DELETE ON TABLE public.request_messages TO authenticated;

-- 3. public.request_history:
-- anon: NO PRIVILEGES
-- authenticated: SELECT only (mutations occur strictly via database triggers)
GRANT SELECT ON TABLE public.request_history TO authenticated;

-- 4. public.credential_audit_log:
-- anon: NO PRIVILEGES
-- authenticated: SELECT only (mutations occur strictly via serverClient service_role)
GRANT SELECT ON TABLE public.credential_audit_log TO authenticated;

-- Ensure sequences can be used if any exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- -------------------------------------------------------------------------
-- STEP 3: SECURITY DEFINER FUNCTIONS & TRIGGERS
-- -------------------------------------------------------------------------

-- 3.1 Initial Intake Tracking Note Trigger (Eliminates anon message insert)
-- Executes strictly without swallowing exceptions to ensure failures are visible
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
        '[INTAKE] New ' || COALESCE(NEW.type::text, 'request') || ' received from ' || COALESCE(NEW.requester_name, 'Anonymous') || '. Assigned to: ' || COALESCE(NEW.assigned_to::text, 'Unassigned') || '.',
        timezone('utc'::text, now())
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_request_initial_intake_note ON public.requests;
CREATE TRIGGER trigger_request_initial_intake_note
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_request_initial_intake_note();

-- 3.2 Customer Identity Binding on INSERT
CREATE OR REPLACE FUNCTION public.set_request_customer_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_staff BOOLEAN := FALSE;
BEGIN
    -- Allow service_role API client (e.g., automated server tasks)
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = v_caller_id 
            AND p.status = 'active'
            AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
        ) INTO v_is_staff;
    END IF;

    IF v_is_staff THEN
        RETURN NEW;
    END IF;

    -- For non-staff callers:
    IF v_caller_id IS NOT NULL THEN
        -- Authenticated customers must be bound to their own auth.uid()
        NEW.customer_id := v_caller_id;
        IF NEW.requester_email IS NULL OR NEW.requester_email = '' THEN
            NEW.requester_email := auth.jwt()->>'email';
        END IF;
    ELSE
        -- Anonymous callers cannot forge customer_id
        NEW.customer_id := NULL;
    END IF;

    -- Synchronize payload requesterInfo if payload exists
    IF NEW.payload IS NOT NULL AND NEW.payload ? 'requesterInfo' THEN
        NEW.payload := jsonb_set(
            NEW.payload,
            '{requesterInfo,customerId}',
            to_jsonb(COALESCE(NEW.customer_id::text, ''))
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_request_customer_identity ON public.requests;
CREATE TRIGGER trigger_set_request_customer_identity
BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.set_request_customer_identity();

-- 3.3 Privileged Field Protection on UPDATE
-- Protects customer_id, assigned_to, type, id, created_at against customer/partner manipulation
-- Blocks modifications even when the old value was NULL
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
    -- Allow service_role API client (e.g., automated server tasks)
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Evaluate whether the authenticated caller is an active staff member
    IF v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = v_caller_id 
            AND p.status = 'active'
            AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
        ) INTO v_is_staff;
    END IF;

    -- Authorized staff can triage, reassign, update customer identity, and update status
    IF v_is_staff THEN
        RETURN NEW;
    END IF;

    -- Non-staff callers (including anonymous users, customers, and partners):
    -- 1. Primary key id is immutable
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Unauthorized: request ID cannot be altered';
    END IF;

    -- 2. customer_id cannot be set or modified by non-staff (including when OLD.customer_id is NULL)
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
        RAISE EXCEPTION 'Unauthorized: only staff can set or modify customer identity';
    END IF;

    -- 3. assigned_to cannot be set or modified by non-staff (including when OLD.assigned_to is NULL)
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
        RAISE EXCEPTION 'Unauthorized: only authorized staff can set or change request assignment';
    END IF;

    -- 4. request type cannot be altered
    IF NEW.type IS DISTINCT FROM OLD.type THEN
        RAISE EXCEPTION 'Unauthorized: request type cannot be altered';
    END IF;

    -- 5. created_at cannot be altered
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Unauthorized: request creation timestamp cannot be altered';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_request_privileged_fields ON public.requests;
CREATE TRIGGER trigger_protect_request_privileged_fields
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.protect_request_privileged_fields();

-- 3.4 Request Mutation Audit Logging Trigger
CREATE OR REPLACE FUNCTION public.trg_log_request_mutation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT := 'System';
    v_actor_role TEXT := 'system';
BEGIN
    IF v_actor_id IS NOT NULL THEN
        SELECT name_en, role INTO v_actor_name, v_actor_role FROM public.partners WHERE id = v_actor_id;
        IF v_actor_name IS NULL THEN
            v_actor_name := COALESCE(auth.jwt()->>'email', 'Authenticated User');
            v_actor_role := 'customer';
        END IF;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.request_history (
            request_id, actor_id, actor_name, actor_role, action,
            new_status, new_assigned_to, metadata, note, created_at
        ) VALUES (
            NEW.id, v_actor_id, v_actor_name, v_actor_role, 'created',
            NEW.status, NEW.assigned_to, 
            jsonb_build_object('type', NEW.type, 'requestId', NEW.id),
            'تم إنشاء الطلب في النظام', timezone('utc'::text, now())
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
            INSERT INTO public.request_history (
                request_id, actor_id, actor_name, actor_role,
                action, old_status, new_status, old_assigned_to, new_assigned_to,
                metadata, note, created_at
            ) VALUES (
                NEW.id, v_actor_id, v_actor_name, v_actor_role,
                CASE 
                    WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'reassigned'
                    ELSE 'status_changed'
                END,
                OLD.status, NEW.status, OLD.assigned_to, NEW.assigned_to,
                jsonb_build_object('type', NEW.type, 'requestId', NEW.id),
                CASE 
                    WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'تمت إعادة تعيين مسؤول الطلب'
                    ELSE 'تحديث حالة الطلب إلى: ' || COALESCE(NEW.status, '')
                END,
                timezone('utc'::text, now())
            );
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.request_history (
            request_id, actor_id, actor_name, actor_role,
            action, old_status, old_assigned_to,
            metadata, note, created_at
        ) VALUES (
            OLD.id, v_actor_id, v_actor_name, v_actor_role,
            'deleted',
            OLD.status, OLD.assigned_to,
            jsonb_build_object('type', OLD.type, 'deleted_request_id', OLD.id),
            'تم حذف الطلب من قبل مسؤول النظام',
            timezone('utc'::text, now())
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS log_request_mutation_trigger ON public.requests;
CREATE TRIGGER log_request_mutation_trigger
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_log_request_mutation();

DROP TRIGGER IF EXISTS log_request_deletion_trigger ON public.requests;
CREATE TRIGGER log_request_deletion_trigger
BEFORE DELETE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_log_request_mutation();

-- -------------------------------------------------------------------------
-- STEP 4: DROP OBSERVED PRODUCTION POLICIES & CONFLICTING LEGACY POLICIES
-- -------------------------------------------------------------------------

-- On public.request_messages:
DROP POLICY IF EXISTS "Public can insert request_messages" ON public.request_messages;
DROP POLICY IF EXISTS "Anyone can insert request_messages" ON public.request_messages;
DROP POLICY IF EXISTS "Partners insert messages for assigned requests" ON public.request_messages;
DROP POLICY IF EXISTS "Partners read messages for assigned requests" ON public.request_messages;
DROP POLICY IF EXISTS "Admins have full access to request messages" ON public.request_messages;
DROP POLICY IF EXISTS "Customers view messages for own requests" ON public.request_messages;
DROP POLICY IF EXISTS "Customers insert messages for own requests" ON public.request_messages;
DROP POLICY IF EXISTS "Assigned partners view messages for assigned requests" ON public.request_messages;
DROP POLICY IF EXISTS "Assigned partners insert messages for assigned requests" ON public.request_messages;
DROP POLICY IF EXISTS "Admins and managers view and insert all request messages" ON public.request_messages;
DROP POLICY IF EXISTS "Staff view all messages and internal notes" ON public.request_messages;
DROP POLICY IF EXISTS "Staff insert messages and internal notes" ON public.request_messages;
DROP POLICY IF EXISTS "Super admins delete request messages" ON public.request_messages;

-- On public.requests:
DROP POLICY IF EXISTS "Public can insert requests" ON public.requests;
DROP POLICY IF EXISTS "Public and authenticated users can create requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can create a request or inquiry" ON public.requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Admins and managers manage requests" ON public.requests;
DROP POLICY IF EXISTS "Partners manage assigned requests" ON public.requests;
DROP POLICY IF EXISTS "Partners update assigned requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners can view their requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners view assigned requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners can update their requests" ON public.requests;
DROP POLICY IF EXISTS "Assigned partners update assigned requests" ON public.requests;
DROP POLICY IF EXISTS "Customers view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Customers view own requests" ON public.requests;
DROP POLICY IF EXISTS "Customers update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Customers update own requests" ON public.requests;
DROP POLICY IF EXISTS "Staff view domain-scoped requests" ON public.requests;
DROP POLICY IF EXISTS "Staff update requests" ON public.requests;
DROP POLICY IF EXISTS "Super admins delete requests" ON public.requests;

-- On public.request_history:
DROP POLICY IF EXISTS "Authenticated users insert request history" ON public.request_history;
DROP POLICY IF EXISTS "Users insert request history" ON public.request_history;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.request_history;
DROP POLICY IF EXISTS "Authenticated users update request history" ON public.request_history;
DROP POLICY IF EXISTS "Authenticated users delete request history" ON public.request_history;
DROP POLICY IF EXISTS "Admins and managers view all request history" ON public.request_history;
DROP POLICY IF EXISTS "Admins and managers view scoped request history" ON public.request_history;
DROP POLICY IF EXISTS "Assigned partners view history of assigned requests" ON public.request_history;
DROP POLICY IF EXISTS "Customers view history of own requests" ON public.request_history;

-- On public.credential_audit_log:
DROP POLICY IF EXISTS "Deny client insert on credential_audit_log" ON public.credential_audit_log;
DROP POLICY IF EXISTS "Deny client update on credential_audit_log" ON public.credential_audit_log;
DROP POLICY IF EXISTS "Deny client delete on credential_audit_log" ON public.credential_audit_log;
DROP POLICY IF EXISTS "Authorized users view credential audit log" ON public.credential_audit_log;

-- -------------------------------------------------------------------------
-- STEP 5: ROW LEVEL SECURITY CONFIGURATION (ENABLE, NO FORCE)
-- -------------------------------------------------------------------------
-- FORCE RLS applies policies to table owners (postgres), breaking SECURITY DEFINER
-- triggers executing under unauthenticated (anon) contexts. NO FORCE RLS is safe
-- because client roles (anon, authenticated) do not own the tables and do not have BYPASSRLS.

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_messages NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_history NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credential_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_audit_log NO FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- STEP 6: RECREATE HARDENED POLICIES FOR PUBLIC.REQUESTS
-- -------------------------------------------------------------------------

-- 6.1 INSERT: Public & Authenticated create requests (intake)
CREATE POLICY "Public and authenticated users can create requests" 
ON public.requests FOR INSERT 
WITH CHECK (
    status IS NULL OR status IN ('new', 'pending')
);

-- 6.2 SELECT: Authenticated Customers (Own requests only)
CREATE POLICY "Customers view own requests" 
ON public.requests FOR SELECT 
USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
);

-- 6.3 SELECT: Authenticated Partners (Assigned requests only)
CREATE POLICY "Assigned partners view assigned requests" 
ON public.requests FOR SELECT 
USING (
    assigned_to = auth.uid() 
    OR (payload->>'partnerId')::uuid = auth.uid()
);

-- 6.4 SELECT: Internal Staff (Domain-scoped visibility)
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

-- 6.5 UPDATE: Authenticated Customers (Own requests; protected fields guarded by trigger)
CREATE POLICY "Customers update own requests" 
ON public.requests FOR UPDATE 
USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
)
WITH CHECK (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
);

-- 6.6 UPDATE: Authenticated Partners (Assigned requests; assignment immutable)
CREATE POLICY "Assigned partners update assigned requests" 
ON public.requests FOR UPDATE 
USING (
    assigned_to = auth.uid() 
    OR (payload->>'partnerId')::uuid = auth.uid()
)
WITH CHECK (
    requests.assigned_to = auth.uid()
    OR (requests.payload->>'partnerId')::uuid = auth.uid()
);

-- 6.7 UPDATE: Internal Staff (Triage, reassignments, status management)
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

-- 6.8 DELETE: Super Admins Only
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
-- STEP 7: RECREATE HARDENED POLICIES FOR PUBLIC.REQUEST_MESSAGES
-- -------------------------------------------------------------------------

-- 7.1 SELECT: Customers (Own requests, strictly ordinary messages only)
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

-- 7.2 SELECT: Assigned Partners (Assigned requests, strictly ordinary messages only)
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

-- 7.3 SELECT: Internal Staff (All messages and internal operational notes)
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

-- 7.4 INSERT: Customers (Own requests, sender='client', type='message')
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

-- 7.5 INSERT: Assigned Partners (Assigned requests, sender='partner', type='message')
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

-- 7.6 INSERT: Internal Staff (Can post messages or internal operational notes)
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

-- 7.7 DELETE: Super Admins Only
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

-- -------------------------------------------------------------------------
-- STEP 8: RECREATE HARDENED POLICIES FOR PUBLIC.REQUEST_HISTORY
-- -------------------------------------------------------------------------

-- 8.1 SELECT: Internal Staff (Domain-scoped visibility)
CREATE POLICY "Admins and managers view scoped request history" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
        AND (
            p.role = 'super_admin'
            OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    (r.type = 'LEAD' AND (
                        r.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                        OR r.payload->>'category' = 'turnkey'
                        OR r.payload->>'serviceTitle' ILIKE '%تشطيب%'
                        OR r.payload->>'serviceTitle' ILIKE '%finishing%'
                    ))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role = 'decoration_manager' AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    (r.type = 'LEAD' AND (
                        r.payload->>'serviceType' IN ('decorations', 'decoration')
                        OR r.payload->>'serviceTitle' ILIKE '%ديكور%'
                        OR r.payload->>'serviceTitle' ILIKE '%decor%'
                    ))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                    OR (r.type = 'LEAD' AND (r.payload->>'serviceType' = 'property' OR r.payload->>'propertyId' IS NOT NULL))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role = 'partner_relations_manager' AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type = 'PARTNER_APPLICATION'
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role IN ('customer_relations_manager', 'service_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                    OR r.assigned_to = auth.uid()
                )
            ))
        )
    )
);

-- 8.2 SELECT: Assigned Partners (Assigned requests only)
CREATE POLICY "Assigned partners view history of assigned requests" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid()
        )
    )
);

-- 8.3 SELECT: Authenticated Customers (Own requests only)
CREATE POLICY "Customers view history of own requests" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

-- -------------------------------------------------------------------------
-- STEP 9: RECREATE HARDENED POLICIES FOR PUBLIC.CREDENTIAL_AUDIT_LOG
-- -------------------------------------------------------------------------

-- SELECT: Target user can view their own entries; authorized staff can view all entries
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

-- (Note: No INSERT/UPDATE/DELETE policies are granted on public.request_history or
-- public.credential_audit_log. Client writes are completely prohibited by both RLS
-- and revoked table privileges. Writes are executed strictly by SECURITY DEFINER
-- database triggers and privileged serverClient via service_role.)
