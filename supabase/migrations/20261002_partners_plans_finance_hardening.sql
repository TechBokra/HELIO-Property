-- =========================================================================
-- MIGRATION: 20261002_partners_plans_finance_hardening.sql
-- PURPOSE: Partners, Subscription Plans & Financial Operations Production Hardening
--          - Enable Row Level Security (RLS) on public.transactions
--          - Enforce least-privilege policies for partners & admins on transactions
--          - Broaden public.partners RLS so administrators can view & manage non-active partners
--          - Create performance indexes on transactions & partner tables
-- =========================================================================

-- 1. ENABLE RLS ON TRANSACTIONS TABLE
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. TRANSACTIONS POLICIES
-- A. View Policy: Partners see only their transactions; admins see all
DROP POLICY IF EXISTS "Partners view own transactions or admins view all" ON public.transactions;
CREATE POLICY "Partners view own transactions or admins view all"
ON public.transactions FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager')
    )
);

-- B. Insert Policy: Users can record their own transaction receipt/attempt; admins can record any
DROP POLICY IF EXISTS "Users insert own transactions or admins insert any" ON public.transactions;
CREATE POLICY "Users insert own transactions or admins insert any"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager')
    )
);

-- C. Update Policy: Only platform admins & finance/service managers can approve/reject/update transactions
DROP POLICY IF EXISTS "Admins manage transactions" ON public.transactions;
CREATE POLICY "Admins manage transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager')
    )
);

-- D. Delete Policy: Only super admins can delete transactions
DROP POLICY IF EXISTS "Super admins delete transactions" ON public.transactions;
CREATE POLICY "Super admins delete transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
);

-- 3. ENHANCE PARTNERS RLS FOR MANAGEMENT
-- Existing policy only permits active partners to be viewed:
-- "Public profiles are viewable by everyone" ON public.partners FOR SELECT USING (status = 'active');
-- We add administrative view policy for pending/disabled/suspended partners:
DROP POLICY IF EXISTS "Admins view all partners" ON public.partners;
CREATE POLICY "Admins view all partners"
ON public.partners FOR SELECT
TO authenticated
USING (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager' OR p.role = 'service_manager')
    )
);

-- Add administrative update policy so admins can change partner status, plan, and permissions:
DROP POLICY IF EXISTS "Admins update partners" ON public.partners;
CREATE POLICY "Admins update partners"
ON public.partners FOR UPDATE
TO authenticated
USING (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager')
    )
);

-- 4. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partners_type ON public.partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_plan ON public.partners(subscription_plan);
