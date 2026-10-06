-- ============================================================================
-- ONLY HELIO — PHASE 2: SECURITY & GOVERNANCE HARDENING
-- Migration: 20261008_site_content_and_lookup_rls_hardening.sql
-- Hardens RLS on site_content, property_types, finishing_statuses, amenities
-- Enforces: Public READ, Strictly Super Admin / Content Manager WRITE
-- ============================================================================

-- 1. Site Content (CMS, Plans, Routing Rules, Automation)
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view site content" ON public.site_content;
CREATE POLICY "Public can view site content" 
ON public.site_content 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Super admins and content managers manage site content" ON public.site_content;
CREATE POLICY "Super admins and content managers manage site content" 
ON public.site_content 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND (role = 'super_admin' OR role = 'content_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND (role = 'super_admin' OR role = 'content_manager')
    )
);

-- 2. Lookup Tables: Property Types
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view property types" ON public.property_types;
CREATE POLICY "Public view property types" 
ON public.property_types 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Super admins manage property types" ON public.property_types;
CREATE POLICY "Super admins manage property types" 
ON public.property_types 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- 3. Lookup Tables: Finishing Statuses
ALTER TABLE public.finishing_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view finishing statuses" ON public.finishing_statuses;
CREATE POLICY "Public view finishing statuses" 
ON public.finishing_statuses 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Super admins manage finishing statuses" ON public.finishing_statuses;
CREATE POLICY "Super admins manage finishing statuses" 
ON public.finishing_statuses 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- 4. Lookup Tables: Amenities
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view amenities" ON public.amenities;
CREATE POLICY "Public view amenities" 
ON public.amenities 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Super admins manage amenities" ON public.amenities;
CREATE POLICY "Super admins manage amenities" 
ON public.amenities 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
);
