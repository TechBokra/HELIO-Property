-- Migration: 20261005_execution_p0_security_hardening.sql
-- Description: Execution P0 Security Hardening: Protect milestone financial fields (payment_status, payment_percentage) via BEFORE UPDATE trigger and enforce active partner status on milestone RLS

-- 1. Database Trigger: Protect milestone financial fields from contractor / customer tampering
CREATE OR REPLACE FUNCTION public.protect_finishing_milestone_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_staff BOOLEAN := FALSE;
BEGIN
    -- If executed by database internal triggers / migrations where auth.uid() is NULL, allow
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if caller is platform super_admin or authorized platform finishing manager
    SELECT EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = v_caller_id 
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role = 'platform_finishing_manager' OR p.role = 'finishing_market_manager')
    ) INTO v_is_staff;

    IF v_is_staff THEN
        RETURN NEW;
    END IF;

    -- Non-staff callers (contractors, partners, customers) MUST NOT modify payment_status
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
        RAISE EXCEPTION 'Unauthorized: only platform administrators and finishing managers can modify milestone payment status (attempted % -> %).', OLD.payment_status, NEW.payment_status;
    END IF;

    -- Non-staff callers MUST NOT modify payment_percentage
    IF NEW.payment_percentage IS DISTINCT FROM OLD.payment_percentage THEN
        RAISE EXCEPTION 'Unauthorized: only platform administrators and finishing managers can modify milestone payment percentage (attempted % -> %).', OLD.payment_percentage, NEW.payment_percentage;
    END IF;

    -- Non-staff callers MUST NOT alter target request_id or stage_number
    IF NEW.request_id IS DISTINCT FROM OLD.request_id THEN
        RAISE EXCEPTION 'Unauthorized: milestone request link is immutable.';
    END IF;

    IF NEW.stage_number IS DISTINCT FROM OLD.stage_number THEN
        RAISE EXCEPTION 'Unauthorized: milestone stage number is immutable.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_finishing_milestone_financial_fields ON public.finishing_milestones;
CREATE TRIGGER trigger_protect_finishing_milestone_financial_fields
BEFORE UPDATE ON public.finishing_milestones
FOR EACH ROW EXECUTE FUNCTION public.protect_finishing_milestone_financial_fields();

-- 2. Update RLS policies on public.finishing_milestones for active partner enforcement

-- Ensure RLS is active
ALTER TABLE public.finishing_milestones ENABLE ROW LEVEL SECURITY;

-- 2.1 Customer view policy (Strictly isolated to request owner)
DROP POLICY IF EXISTS "Customers view milestones for own requests" ON public.finishing_milestones;
CREATE POLICY "Customers view milestones for own requests" ON public.finishing_milestones 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (
            (requests.customer_id IS NOT NULL AND requests.customer_id = auth.uid())
            OR requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

-- 2.2 Assigned partner view policy (Requires assigned contractor and ACTIVE status)
DROP POLICY IF EXISTS "Assigned partners view own project milestones" ON public.finishing_milestones;
CREATE POLICY "Assigned partners view own project milestones" ON public.finishing_milestones 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (requests.assigned_to = auth.uid() OR (requests.payload->>'partnerId')::uuid = auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
);

-- 2.3 Assigned partner update policy (Requires assigned contractor, ACTIVE status, and permitted non-financial fields)
DROP POLICY IF EXISTS "Assigned partners update own project milestones" ON public.finishing_milestones;
CREATE POLICY "Assigned partners update own project milestones" ON public.finishing_milestones 
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (requests.assigned_to = auth.uid() OR (requests.payload->>'partnerId')::uuid = auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (requests.assigned_to = auth.uid() OR (requests.payload->>'partnerId')::uuid = auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
);

-- 2.4 Platform Managers & Super Admin management policy (Full operational management)
DROP POLICY IF EXISTS "Admins manage all finishing milestones" ON public.finishing_milestones;
CREATE POLICY "Admins manage all finishing milestones" ON public.finishing_milestones 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND status = 'active'
        AND (role = 'super_admin' OR role = 'platform_finishing_manager' OR role = 'finishing_market_manager')
    )
);
