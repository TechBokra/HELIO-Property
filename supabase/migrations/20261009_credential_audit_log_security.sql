-- =========================================================================
-- MIGRATION: 20261009_credential_audit_log_security.sql
-- PURPOSE: Forward-only migration for dedicated, append-only credential audit logging
--          1. Create public.credential_audit_log table with strict constraints
--          2. Enable Row Level Security (RLS)
--          3. Restrict SELECT to Super Admins, managers with view_audit_log, and self target-user
--          4. Deny all direct client INSERT, UPDATE, and DELETE (immutable audit log)
-- =========================================================================

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

-- Indices for query performance
CREATE INDEX IF NOT EXISTS idx_credential_audit_actor ON public.credential_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_target ON public.credential_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_created ON public.credential_audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.credential_audit_log ENABLE ROW LEVEL SECURITY;

-- Deny all client write operations (immutable table; writes occur strictly via trusted server path)
DROP POLICY IF EXISTS "Deny client insert on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client insert on credential_audit_log" 
ON public.credential_audit_log FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client update on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client update on credential_audit_log" 
ON public.credential_audit_log FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Deny client delete on credential_audit_log" ON public.credential_audit_log;
CREATE POLICY "Deny client delete on credential_audit_log" 
ON public.credential_audit_log FOR DELETE USING (false);

-- SELECT policies: Super Admins, managers with credential or audit view permissions, and target user
DROP POLICY IF EXISTS "Authorized users view credential audit log" ON public.credential_audit_log;
CREATE POLICY "Authorized users view credential audit log" 
ON public.credential_audit_log FOR SELECT 
USING (
    -- Target user can inspect audit events concerning their own identity
    target_user_id = auth.uid()
    OR
    -- Authorized Super Admins and managers
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

COMMENT ON TABLE public.credential_audit_log IS 'Immutable append-only audit trail for administrative password resets and credential events. Never records passwords, hashes, tokens, or keys.';
