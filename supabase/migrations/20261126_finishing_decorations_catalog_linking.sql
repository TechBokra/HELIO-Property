-- =========================================================================
-- MIGRATION: 20261126_finishing_decorations_catalog_linking.sql
-- PURPOSE:
--   1. Make public.finishing_services the authoritative RLS-protected catalog
--      with target_partner_id & active/order indexing.
--   2. One-time idempotent transition of legacy site_content.finishingServices
--      into public.finishing_services when the catalog table is empty.
--   3. Link public.portfolio_items to public.decoration_categories via category_id
--      with backfill from bilingual category names.
-- =========================================================================

-- 1. Finishing Services Catalog Schema & RLS Hardening
ALTER TABLE public.finishing_services
    ADD COLUMN IF NOT EXISTS target_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finishing_services_active_order
    ON public.finishing_services (is_active, display_order, created_at);

ALTER TABLE public.finishing_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active finishing services" ON public.finishing_services;
CREATE POLICY "Public view active finishing services"
ON public.finishing_services
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage finishing services" ON public.finishing_services;
CREATE POLICY "Admins manage finishing services"
ON public.finishing_services
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.partners
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'platform_finishing_manager', 'finishing_market_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'platform_finishing_manager', 'finishing_market_manager')
    )
);

-- 2. Idempotent Transition of Legacy site_content.finishingServices (only if finishing_services is empty)
DO $$
DECLARE
    v_services JSONB;
    v_item JSONB;
    v_idx INT := 0;
    v_raw_id TEXT;
    v_uuid UUID;
    v_partner_uuid UUID;
    v_raw_partner TEXT;
    v_hash TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.finishing_services LIMIT 1) THEN
        SELECT content->'finishingServices'
        INTO v_services
        FROM public.site_content
        WHERE key = 'main_content'
        LIMIT 1;

        IF v_services IS NOT NULL AND jsonb_typeof(v_services) = 'array' THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_services)
            LOOP
                v_idx := v_idx + 1;
                v_raw_id := COALESCE(NULLIF(TRIM(v_item->>'id'), ''), 'fs-legacy-' || v_idx::text);

                IF v_raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
                    v_uuid := v_raw_id::uuid;
                ELSE
                    v_hash := md5('onlyhelio_finishing_service:' || v_raw_id);
                    v_uuid := (
                        substr(v_hash, 1, 8) || '-' ||
                        substr(v_hash, 9, 4) || '-' ||
                        '4' || substr(v_hash, 14, 3) || '-' ||
                        '8' || substr(v_hash, 18, 3) || '-' ||
                        substr(v_hash, 21, 12)
                    )::uuid;
                END IF;

                v_partner_uuid := NULL;
                v_raw_partner := NULLIF(TRIM(COALESCE(v_item->>'targetPartnerId', '')), '');
                IF v_raw_partner ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
                    SELECT id INTO v_partner_uuid
                    FROM public.partners
                    WHERE id = v_raw_partner::uuid
                    LIMIT 1;
                END IF;

                INSERT INTO public.finishing_services (
                    id,
                    title_en,
                    title_ar,
                    description_en,
                    description_ar,
                    category,
                    pricing_model,
                    base_price,
                    currency,
                    pricing_tiers,
                    features,
                    is_active,
                    display_order,
                    target_partner_id,
                    image_url,
                    created_at,
                    updated_at
                ) VALUES (
                    v_uuid,
                    COALESCE(NULLIF(TRIM(v_item->'title'->>'en'), ''), 'Finishing Service'),
                    COALESCE(NULLIF(TRIM(v_item->'title'->>'ar'), ''), 'خدمة تشطيب'),
                    COALESCE(v_item->'description'->>'en', ''),
                    COALESCE(v_item->'description'->>'ar', ''),
                    COALESCE(NULLIF(TRIM(v_item->>'category'), ''), 'turnkey'),
                    COALESCE(NULLIF(TRIM(v_item->>'pricingModel'), ''), 'fixed_package'),
                    COALESCE(NULLIF(TRIM(v_item->>'basePrice'), '')::numeric, 0),
                    COALESCE(NULLIF(TRIM(v_item->>'currency'), ''), 'EGP'),
                    COALESCE(v_item->'pricingTiers', '[]'::jsonb),
                    COALESCE(v_item->'features', '[]'::jsonb),
                    COALESCE((v_item->>'isActive')::boolean, TRUE),
                    COALESCE(NULLIF(TRIM(v_item->>'displayOrder'), '')::int, v_idx),
                    v_partner_uuid,
                    NULLIF(TRIM(COALESCE(v_item->>'imageUrl', '')), ''),
                    NOW(),
                    NOW()
                )
                ON CONFLICT (id) DO NOTHING;
            END LOOP;
        END IF;
    END IF;
END $$;

-- 3. Portfolio Items Foreign Key Link to Decoration Categories
ALTER TABLE public.portfolio_items
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.decoration_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_items_category_id
    ON public.portfolio_items (category_id);

-- Backfill category_id for existing portfolio items using bilingual category name match
UPDATE public.portfolio_items pi
SET category_id = dc.id
FROM public.decoration_categories dc
WHERE pi.category_id IS NULL
  AND (
      (COALESCE(TRIM(pi.category_en), '') <> '' AND LOWER(TRIM(pi.category_en)) = LOWER(TRIM(dc.name_en)))
      OR (COALESCE(TRIM(pi.category_ar), '') <> '' AND LOWER(TRIM(pi.category_ar)) = LOWER(TRIM(dc.name_ar)))
  );

-- 4. Lightweight catalog existence helper (lets anon distinguish empty table from all-inactive rows)
CREATE OR REPLACE FUNCTION public.finishing_catalog_exists()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.finishing_services);
$$;

GRANT EXECUTE ON FUNCTION public.finishing_catalog_exists() TO anon, authenticated;
