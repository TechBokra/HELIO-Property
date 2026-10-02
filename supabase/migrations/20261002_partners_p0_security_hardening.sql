-- =========================================================================
-- MIGRATION: 20261002_partners_p0_security_hardening.sql
-- PURPOSE: Partners Domain P0 Security Hardening
--          P0.1: SEC-01 — Prevent privilege escalation through public.partners
--                Protect role, status, subscription_plan, custom_permissions, type
--                Enforce database-level BEFORE INSERT/UPDATE trigger and strict RLS
--          P0.2: SEC-02 — DB-enforced role and status integrity (no email heuristics)
-- =========================================================================

-- 1. Create trusted trigger function to guard privileged columns on public.partners
CREATE OR REPLACE FUNCTION public.protect_partner_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_is_super_admin BOOLEAN := FALSE;
    v_is_relations_manager BOOLEAN := FALSE;
BEGIN
    -- If running in background, migration, or internal service role context without JWT, allow
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Fetch caller's current role from public.partners
    SELECT role::text INTO v_caller_role
    FROM public.partners
    WHERE id = v_caller_id;

    v_is_super_admin := (v_caller_role = 'super_admin');
    v_is_relations_manager := (v_caller_role = 'partner_relations_manager');

    -- Super Admin has full administrative control over all partner records
    IF v_is_super_admin THEN
        RETURN NEW;
    END IF;

    -- GUARD ON INSERT: Prevent non-admins from self-assigning administrative roles or privileges
    IF TG_OP = 'INSERT' THEN
        -- Non-admins cannot insert rows with privileged roles
        IF NEW.role IS NOT NULL AND NEW.role::text NOT IN ('agency_partner', 'finishing_partner', 'developer_partner') THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can assign administrative partner roles (attempted %).', NEW.role;
        END IF;

        -- Non-admins cannot create admin/manager account types
        IF NEW.type IS NOT NULL AND NEW.type IN (
            'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
            'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
            'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can create administrative account types.';
        END IF;

        -- Non-admins cannot assign custom permissions
        IF NEW.custom_permissions IS NOT NULL AND array_length(NEW.custom_permissions, 1) > 0 THEN
            RAISE EXCEPTION 'Unauthorized: custom permissions can only be granted by a super admin.';
        END IF;

        -- Non-admins cannot self-activate or self-assign elite plans
        IF NOT v_is_relations_manager THEN
            IF NEW.status IS NOT NULL AND NEW.status::text IN ('active', 'approved') AND v_caller_id = NEW.id THEN
                NEW.status := 'pending'::partner_status;
            END IF;
            IF NEW.subscription_plan IS NOT NULL AND NEW.subscription_plan NOT IN ('basic', 'commission') THEN
                NEW.subscription_plan := 'basic';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    -- GUARD ON UPDATE: Prevent non-admins from modifying privileged business and authorization fields
    IF TG_OP = 'UPDATE' THEN
        -- A: ROLE change — ONLY super_admin
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner role (attempted % -> %).', OLD.role, NEW.role;
        END IF;

        -- B: CUSTOM PERMISSIONS — ONLY super_admin
        IF NEW.custom_permissions IS DISTINCT FROM OLD.custom_permissions THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify custom permissions.';
        END IF;

        -- C: TYPE change to admin/manager or altering company type — ONLY super_admin
        IF NEW.type IS DISTINCT FROM OLD.type THEN
            IF NEW.type IN (
                'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
                'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
                'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
            ) OR NOT v_is_relations_manager THEN
                RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner account type.';
            END IF;
        END IF;

        -- D: STATUS change — ONLY super_admin OR partner_relations_manager
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify partner status (attempted % -> %).', OLD.status, NEW.status;
            END IF;
        END IF;

        -- E: SUBSCRIPTION PLAN & VALIDITY — ONLY super_admin OR partner_relations_manager
        IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan) OR (NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date) THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify subscription plan or expiration date.';
            END IF;
        END IF;

        -- F: PARENT_ID (organization hierarchy) — ONLY super_admin OR partner_relations_manager
        IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify organization hierarchy.';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Bind the trigger to public.partners
DROP TRIGGER IF EXISTS trigger_protect_partner_privileged_fields ON public.partners;
CREATE TRIGGER trigger_protect_partner_privileged_fields
BEFORE INSERT OR UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.protect_partner_privileged_fields();


-- 3. Hardened RLS Policies on public.partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Ensure public profiles remain viewable for active partners
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.partners;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.partners FOR SELECT 
USING (status = 'active');

-- Ensure partners view their own row, and managers/admins view all
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

-- Allow authenticated users to insert their own initial profile or admins to insert any
DROP POLICY IF EXISTS "Users insert own profile or admins insert any" ON public.partners;
CREATE POLICY "Users insert own profile or admins insert any"
ON public.partners FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager')
    )
);

-- Partners can update their own row (protected fields enforced by BEFORE UPDATE trigger)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.partners;
DROP POLICY IF EXISTS "Partners update own profile" ON public.partners;
CREATE POLICY "Partners update own profile" 
ON public.partners FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can update any partner row
DROP POLICY IF EXISTS "Admins update partners" ON public.partners;
CREATE POLICY "Admins update partners" 
ON public.partners FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager')
    )
);
