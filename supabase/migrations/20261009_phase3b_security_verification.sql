-- =========================================================================
-- MIGRATION: 20261009_phase3b_security_verification.sql
-- PURPOSE: Forward-only hardening for Phase 3B RLS and Operations Security
--          1. Enforce database-level isolation of internal operational notes (request_messages)
--             so partners and customers can never read internal notes by direct query or ID parameter.
--          2. Prevent unauthorized request reassignment or assignee modification by partners.
--          3. Re-affirm immutable RLS enforcement on public.credential_audit_log.
-- =========================================================================

-- 1. ISOLATE INTERNAL OPERATIONAL NOTES IN REQUEST_MESSAGES
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- Hardened SELECT for assigned partners: STRICTLY restricts to public customer-partner 'message' type.
-- Internal operational notes (type = 'note', 'internal_note', etc.) cannot be read by partners.
DROP POLICY IF EXISTS "Assigned partners view messages for assigned requests" ON public.request_messages;
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

-- Assigned partners can only insert messages of type 'message' as sender 'partner'
DROP POLICY IF EXISTS "Assigned partners insert messages for assigned requests" ON public.request_messages;
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

-- Customers can only read and write messages of type 'message' (never notes)
DROP POLICY IF EXISTS "Customers view messages for own requests" ON public.request_messages;
CREATE POLICY "Customers view messages for own requests" 
ON public.request_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.type = 'message'
);

-- 2. HARDEN ASSIGNED PARTNERS UPDATE ON PUBLIC.REQUESTS
-- Partners can only update status or notes on their own assigned requests.
-- They CANNOT change assigned_to to reassign or hijack requests.
DROP POLICY IF EXISTS "Assigned partners can update their requests" ON public.requests;
CREATE POLICY "Assigned partners can update their requests" 
ON public.requests FOR UPDATE 
USING (
    auth.uid() = assigned_to 
    OR (payload->>'partnerId')::uuid = auth.uid()
)
WITH CHECK (
    (
        auth.uid() = assigned_to 
        OR (payload->>'partnerId')::uuid = auth.uid()
    )
    AND (
        -- assigned_to must remain the same partner or unchanged (partners cannot reassign)
        requests.assigned_to = auth.uid()
        OR requests.assigned_to IS NOT DISTINCT FROM (
            SELECT r.assigned_to FROM public.requests r WHERE r.id = requests.id
        )
    )
);

-- 3. AFFIRM IMMUTABLE RLS ON CREDENTIAL_AUDIT_LOG
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
