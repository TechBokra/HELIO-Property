-- =========================================================================
-- MIGRATION: 20261010_phase3c_finance_analytics_hardening.sql
-- PURPOSE: Phase 3C Finance & Analytics Hardening
--          1. Enforce active-staff checks and anti-fraud integrity on public.transactions
--             - Block client-supplied 'paid' / 'refunded' status on INSERT
--             - Enforce positive finite amount and allowed payment methods
--             - Enforce user_id = auth.uid() for non-finance callers
--             - Add database trigger protect_transaction_integrity()
--          2. Align public.analytics_events RLS policies
--             - Add all active client conversion event types to INSERT allowlist
--             - Require partners.status = 'active' and canonical roles on SELECT
--             - Remove legacy partners.type = 'admin' escalation
--             - Explicitly deny UPDATE and DELETE (append-only log)
-- =========================================================================

-- 1. TRANSACTIONS TABLE HARDENING
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners view own transactions or admins view all" ON public.transactions;
CREATE POLICY "Partners view own transactions or admins view all"
ON public.transactions FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('super_admin', 'service_manager', 'partner_relations_manager')
    )
);

DROP POLICY IF EXISTS "Users insert own transactions or admins insert any" ON public.transactions;
CREATE POLICY "Users insert own transactions or admins insert any"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    (
        user_id = auth.uid()
        AND amount > 0
        AND status IN ('pending', 'reviewing')
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('super_admin', 'service_manager', 'partner_relations_manager')
    )
);

DROP POLICY IF EXISTS "Admins manage transactions" ON public.transactions;
CREATE POLICY "Admins manage transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('super_admin', 'service_manager', 'partner_relations_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('super_admin', 'service_manager', 'partner_relations_manager')
    )
);

DROP POLICY IF EXISTS "Super admins delete transactions" ON public.transactions;
CREATE POLICY "Super admins delete transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role = 'super_admin'
    )
);

-- Data: production stored the legacy status 'completed', which the app does not
-- recognise ('paid' is the canonical TransactionStatus) and which the integrity
-- trigger below rejects. Keep a copy of the original values, then normalise.
CREATE SCHEMA IF NOT EXISTS _migration_backup;
CREATE TABLE IF NOT EXISTS _migration_backup.transactions_status_20260928 AS
SELECT id, status, NOW() AS captured_at FROM public.transactions
WHERE status NOT IN ('pending', 'reviewing', 'paid', 'failed', 'refunded');
UPDATE public.transactions SET status = 'paid' WHERE status = 'completed';

CREATE OR REPLACE FUNCTION public.protect_transaction_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_is_finance_staff BOOLEAN := FALSE;
BEGIN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Invalid transaction amount: must be greater than zero.';
    END IF;

    IF NEW.method IS NULL OR NEW.method NOT IN ('instapay', 'card', 'wallet') THEN
        RAISE EXCEPTION 'Invalid payment method: %', NEW.method;
    END IF;

    IF NEW.status IS NULL OR NEW.status NOT IN ('pending', 'reviewing', 'paid', 'failed', 'refunded') THEN
        RAISE EXCEPTION 'Invalid transaction status: %', NEW.status;
    END IF;

    IF v_caller_id IS NOT NULL THEN
        SELECT role::text, status::text
        INTO v_caller_role, v_caller_status
        FROM public.partners
        WHERE id = v_caller_id;

        v_is_finance_staff := (v_caller_status = 'active')
            AND (v_caller_role IN ('super_admin', 'service_manager', 'partner_relations_manager'));

        IF TG_OP = 'INSERT' AND NOT v_is_finance_staff THEN
            IF NEW.status NOT IN ('pending', 'reviewing') THEN
                RAISE EXCEPTION 'Unauthorized: client transactions cannot self-approve payment status (attempted %).', NEW.status;
            END IF;

            IF NEW.user_id IS DISTINCT FROM v_caller_id THEN
                RAISE EXCEPTION 'Unauthorized: cannot create transaction on behalf of another user.';
            END IF;
        END IF;

        IF TG_OP = 'UPDATE' AND NOT v_is_finance_staff THEN
            RAISE EXCEPTION 'Unauthorized: only active authorized finance administrators may modify transactions.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_transaction_integrity ON public.transactions;
CREATE TRIGGER trigger_protect_transaction_integrity
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.protect_transaction_integrity();

CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON public.transactions(type, status);

-- 2. ANALYTICS EVENTS RLS HARDENING
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can record analytics events" ON public.analytics_events
    FOR INSERT
    TO public
    WITH CHECK (
        event_type IN (
            'whatsapp_click',
            'call_click',
            'property_view',
            'property_inquiry',
            'inquiry_submit',
            'search_performed',
            'filter_applied',
            'finishing_service_view',
            'finishing_request',
            'share_click'
        )
    );

DROP POLICY IF EXISTS "Admins and managers can view analytics events" ON public.analytics_events;
CREATE POLICY "Admins and managers can view analytics events" ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.partners
            WHERE partners.id = auth.uid()
            AND partners.status = 'active'
            AND (
                partners.role = 'super_admin'
                OR partners.role LIKE '%_manager'
            )
        )
    );

DROP POLICY IF EXISTS "Deny update on analytics_events" ON public.analytics_events;
CREATE POLICY "Deny update on analytics_events"
ON public.analytics_events FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Deny delete on analytics_events" ON public.analytics_events;
CREATE POLICY "Deny delete on analytics_events"
ON public.analytics_events FOR DELETE USING (false);
