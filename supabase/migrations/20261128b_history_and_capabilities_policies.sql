-- =============================================================================
-- MIGRATION: 20261128b_history_and_capabilities_policies.sql
-- PURPOSE: Give RLS policies to two tables the app reads and writes but that had
--          RLS enabled with no policy in production (every client call failed):
--   - public.property_history   (written by services/properties.ts)
--   - public.partner_capabilities (PartnerCapabilitiesPage / finishing services)
-- Stricter than supabase/schema.sql, which let anyone insert property history.
-- Uses SECURITY DEFINER helpers from 20261127z/20261128 to avoid partners RLS recursion.
-- =============================================================================

BEGIN;

-- property_history ------------------------------------------------------------
ALTER TABLE public.property_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all property history" ON public.property_history;
CREATE POLICY "Admins view all property history"
ON public.property_history FOR SELECT TO authenticated
USING (
    public.current_partner_role() IN ('super_admin', 'listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager')
);

DROP POLICY IF EXISTS "Partners view own property history" ON public.property_history;
CREATE POLICY "Partners view own property history"
ON public.property_history FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = property_history.property_id AND pr.partner_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users record property history" ON public.property_history;
DROP POLICY IF EXISTS "Owners and staff record property history" ON public.property_history;
CREATE POLICY "Owners and staff record property history"
ON public.property_history FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties pr WHERE pr.id = property_history.property_id AND pr.partner_id = auth.uid())
    OR public.current_partner_role() IN ('super_admin', 'listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager')
);

-- partner_capabilities --------------------------------------------------------
ALTER TABLE public.partner_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view partner capabilities" ON public.partner_capabilities;
CREATE POLICY "Public can view partner capabilities"
ON public.partner_capabilities FOR SELECT
USING (public.partner_is_active(partner_id));

DROP POLICY IF EXISTS "Partners update own capabilities" ON public.partner_capabilities;
CREATE POLICY "Partners update own capabilities"
ON public.partner_capabilities FOR ALL TO authenticated
USING (auth.uid() = partner_id)
WITH CHECK (auth.uid() = partner_id);

DROP POLICY IF EXISTS "Admins manage all partner capabilities" ON public.partner_capabilities;
CREATE POLICY "Admins manage all partner capabilities"
ON public.partner_capabilities FOR ALL TO authenticated
USING (public.is_finishing_admin())
WITH CHECK (public.is_finishing_admin());

-- Partners may describe their capabilities but not certify themselves.
CREATE OR REPLACE FUNCTION public.protect_partner_capability_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.is_finishing_admin() THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
        NEW.is_verified_contractor := FALSE;
    ELSE
        NEW.is_verified_contractor := OLD.is_verified_contractor;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_partner_capability_verification ON public.partner_capabilities;
CREATE TRIGGER trg_protect_partner_capability_verification
BEFORE INSERT OR UPDATE ON public.partner_capabilities
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_capability_verification();

COMMIT;
