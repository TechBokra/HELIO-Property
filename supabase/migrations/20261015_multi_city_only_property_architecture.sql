-- =============================================================================
-- Migration: 20261015_multi_city_only_property_architecture.sql
-- Purpose: Establish the Only Property Multi-City & Subdomain Ecosystem
--          (only-property.com Root Hub + <city>.only-property.com Portals)
--          using a unified PostgreSQL database with city_id tenant isolation
--          and cross-city partner/admin role governance.
-- =============================================================================

BEGIN;

-- 1. Create the Cities Registry Table
CREATE TABLE IF NOT EXISTS public.cities (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    subdomain TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    brand_title_ar TEXT NOT NULL,
    brand_title_en TEXT NOT NULL,
    tagline_ar TEXT NOT NULL DEFAULT '',
    tagline_en TEXT NOT NULL DEFAULT '',
    region_ar TEXT NOT NULL DEFAULT '',
    region_en TEXT NOT NULL DEFAULT '',
    accent_color TEXT NOT NULL DEFAULT '#F59E0B',
    hero_image_url TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT TRUE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on public.cities
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities_public_read" ON public.cities;
CREATE POLICY "cities_public_read"
    ON public.cities
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "cities_super_admin_manage" ON public.cities;
CREATE POLICY "cities_super_admin_manage"
    ON public.cities
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.partners p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND p.role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.partners p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND p.role = 'super_admin'
        )
    );

-- Seed Initial Cities (New Heliopolis, El Shorouk, Badr City)
INSERT INTO public.cities (
    id, slug, subdomain, name_ar, name_en, brand_title_ar, brand_title_en,
    tagline_ar, tagline_en, region_ar, region_en, accent_color, is_active, is_featured, lat, lng
)
VALUES
    (
        'heliopolis',
        'heliopolis',
        'heliopolis.only-property.com',
        'هليوبوليس الجديدة',
        'New Heliopolis',
        'أونلي هليو',
        'ONLY HELIO',
        'المرجع العقاري والخدمي المتخصص لمدينة هليوبوليس الجديدة — كمبوندات، أحياء، تشطيبات وخدمات محلية معتمدة.',
        'The dedicated real estate and lifestyle directory for New Heliopolis — compounds, districts, finishing & verified local services.',
        'شرق القاهرة · طريق السويس',
        'East Cairo · Suez Road',
        '#F59E0B',
        TRUE,
        TRUE,
        30.1286,
        31.6744
    ),
    (
        'shorouk',
        'shorouk',
        'shorouk.only-property.com',
        'مدينة الشروق',
        'El Shorouk City',
        'أونلي الشروق',
        'ONLY SHOROUK',
        'بوابة عقارات وكمبوندات مدينة الشروق — فيلات، شقق سكنية، مراكز تجارية وشركاء تشطيب وديكور.',
        'El Shorouk City property and compound portal — villas, residential apartments, commercial hubs & finishing partners.',
        'شرق القاهرة · محور الإسماعيلية والسويس',
        'East Cairo · Ismailia & Suez Corridor',
        '#059669',
        TRUE,
        TRUE,
        30.1449,
        31.6295
    ),
    (
        'badr',
        'badr',
        'badr.only-property.com',
        'مدينة بدر',
        'Badr City',
        'أونلي بدر',
        'ONLY BADR',
        'دليل مدينة بدر العقاري والاستثماري — مشروعات سكنية وتجارية، أحياء متكاملة وفرص نمو بجوار العاصمة الإدارية.',
        'Badr City real estate and investment portal — residential and commercial projects alongside the New Capital corridor.',
        'شرق القاهرة · ظهير العاصمة الإدارية',
        'East Cairo · New Capital Gateway',
        '#2563EB',
        TRUE,
        TRUE,
        30.1365,
        31.7145
    )
ON CONFLICT (id) DO UPDATE SET
    subdomain = EXCLUDED.subdomain,
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    brand_title_ar = EXCLUDED.brand_title_ar,
    brand_title_en = EXCLUDED.brand_title_en,
    updated_at = NOW();

-- 2. Add Multi-City Scoping Columns to Core Operational Tables
ALTER TABLE IF EXISTS public.properties
    ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis' REFERENCES public.cities(id);

ALTER TABLE IF EXISTS public.projects
    ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis' REFERENCES public.cities(id);

ALTER TABLE IF EXISTS public.requests
    ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis' REFERENCES public.cities(id);

ALTER TABLE IF EXISTS public.banners
    ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis' REFERENCES public.cities(id);

ALTER TABLE IF EXISTS public.transactions
    ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis' REFERENCES public.cities(id);

ALTER TABLE IF EXISTS public.analytics_events
    ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis' REFERENCES public.cities(id);

ALTER TABLE IF EXISTS public.routing_rules
    ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis' REFERENCES public.cities(id);

-- 3. Add Cross-City Authorization Scope to Partners / Managers
ALTER TABLE IF EXISTS public.partners
    ADD COLUMN IF NOT EXISTS allowed_cities TEXT[] NOT NULL DEFAULT ARRAY['heliopolis']::TEXT[];

-- Ensure super_admin accounts have global access across all cities ('*')
UPDATE public.partners
SET allowed_cities = ARRAY['*']::TEXT[]
WHERE role = 'super_admin';

-- 4. Create High-Selectivity Indexes for Subdomain / City Queries
CREATE INDEX IF NOT EXISTS idx_properties_city_id_status ON public.properties (city_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_city_id ON public.projects (city_id);
CREATE INDEX IF NOT EXISTS idx_requests_city_id_created_at ON public.requests (city_id, created_at DESC);
DO $$
BEGIN
    -- Banners live in site_content in production; index the table only where it exists
    IF to_regclass('public.banners') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_banners_city_id_status ON public.banners (city_id, status);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_transactions_city_id_date ON public.transactions (city_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_city_id_created ON public.analytics_events (city_id, created_at DESC);

-- 5. Helper function to check whether an authenticated partner/admin can manage a specific city
CREATE OR REPLACE FUNCTION public.can_access_city(target_city_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND (
              p.role = 'super_admin'
              OR '*' = ANY(p.allowed_cities)
              OR target_city_id = ANY(p.allowed_cities)
          )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_city(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_city(TEXT) TO authenticated, service_role;

COMMIT;
