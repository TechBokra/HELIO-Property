-- =============================================================================
-- MIGRATION: 20261128_finishing_marketplace_foundation.sql
-- PURPOSE: Phase 0 of the Finishing Marketplace plan
--   1. public.finishing_categories      — the 3 public categories, managed from the dashboard
--   2. public.partners.profile_kind     — independent engineer vs company profile
--   3. public.partner_finishing_services — one service per partner per category,
--                                          with admin approval (only approved services are public)
--   4. Backfill pending services from legacy partner_capabilities.categories
--   5. public.finishing_request_invitations — explicit tender invitations
--   6. SECURITY: partner_leads_view no longer exposes every request to every active
--      partner; finishing_quotes INSERT requires assignment or an invitation.
-- Served cities are taken from the admin-controlled public.partners.allowed_cities.
-- =============================================================================

BEGIN;

-- Helper: platform finishing administrators
CREATE OR REPLACE FUNCTION public.is_finishing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND lower(p.role::text) IN ('super_admin', 'platform_finishing_manager', 'finishing_market_manager', 'partner_relations_manager')
    );
$$;
REVOKE ALL ON FUNCTION public.is_finishing_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_finishing_admin() TO anon, authenticated, service_role;

-- Helpers that read public.partners without going through its RLS policies
CREATE OR REPLACE FUNCTION public.partner_is_active(p_partner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM public.partners p WHERE p.id = p_partner_id AND p.status = 'active');
$$;
REVOKE ALL ON FUNCTION public.partner_is_active(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_is_active(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_partner_is_finishing_provider()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid() AND p.type = 'finishing' AND p.status IN ('active', 'approved', 'pending')
    );
$$;
REVOKE ALL ON FUNCTION public.current_partner_is_finishing_provider() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_partner_is_finishing_provider() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Finishing categories (consultation / design_3d / turnkey)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finishing_categories (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT NOT NULL DEFAULT '',
    description_en TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.finishing_categories (id, name_ar, name_en, description_ar, description_en, display_order)
VALUES
    ('consultation', 'الاستشارة ووضع التصور', 'Consultation & Concept',
     'معاينة، مناقشة احتياجاتك وميزانيتك، وتصور مبدئي لنطاق العمل.',
     'Site visit, discussing your needs and budget, and an initial scope of work.', 1),
    ('design_3d', 'التصميم ثلاثي الأبعاد (3D)', '3D Design',
     'تصميم الفراغات والخامات والألوان وإخراج التصور ثلاثي الأبعاد، حسب نطاق عرض مقدم الخدمة.',
     'Space planning, materials, colours and 3D visualisation, per the provider''s offer scope.', 2),
    ('turnkey', 'التنفيذ والإشراف الكامل (Turnkey)', 'Full Execution & Supervision (Turnkey)',
     'تنفيذ التشطيبات وإدارتها والإشراف عليها حتى التسليم، وفق النطاق المتفق عليه مع مقدم الخدمة.',
     'Executing, managing and supervising the finishing works until handover, per the scope agreed with the provider.', 3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.finishing_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view visible finishing categories" ON public.finishing_categories;
CREATE POLICY "Public view visible finishing categories"
ON public.finishing_categories FOR SELECT
USING (is_visible = TRUE OR public.is_finishing_admin());

DROP POLICY IF EXISTS "Finishing admins manage categories" ON public.finishing_categories;
CREATE POLICY "Finishing admins manage categories"
ON public.finishing_categories FOR ALL TO authenticated
USING (public.is_finishing_admin())
WITH CHECK (public.is_finishing_admin());

-- ---------------------------------------------------------------------------
-- 2. Provider profile kind
-- ---------------------------------------------------------------------------
ALTER TABLE public.partners
    ADD COLUMN IF NOT EXISTS profile_kind TEXT NOT NULL DEFAULT 'company';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partners_profile_kind') THEN
        ALTER TABLE public.partners
            ADD CONSTRAINT chk_partners_profile_kind CHECK (profile_kind IN ('company', 'engineer'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Partner finishing services (one per partner per category)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_finishing_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.finishing_categories(id) ON DELETE RESTRICT,
    title_ar TEXT NOT NULL DEFAULT '',
    title_en TEXT NOT NULL DEFAULT '',
    description_ar TEXT NOT NULL DEFAULT '',
    description_en TEXT NOT NULL DEFAULT '',
    scope_ar TEXT NOT NULL DEFAULT '',
    scope_en TEXT NOT NULL DEFAULT '',
    -- How the partner chooses to show pricing. The platform never sets these prices.
    pricing_display TEXT NOT NULL DEFAULT 'on_request',
    price_from NUMERIC,
    currency TEXT NOT NULL DEFAULT 'EGP',
    -- Partner-side switch (hide/show own service without losing approval)
    is_listed BOOLEAN NOT NULL DEFAULT TRUE,
    -- Admin-side approval
    approval_status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    reviewed_by UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_partner_finishing_service UNIQUE (partner_id, category_id),
    CONSTRAINT chk_pfs_pricing_display CHECK (pricing_display IN ('on_request', 'starting_from', 'per_sqm', 'fixed')),
    CONSTRAINT chk_pfs_price_from CHECK (price_from IS NULL OR price_from >= 0),
    CONSTRAINT chk_pfs_price_required CHECK (pricing_display = 'on_request' OR price_from IS NOT NULL),
    CONSTRAINT chk_pfs_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'disabled'))
);

CREATE INDEX IF NOT EXISTS idx_pfs_category_public
    ON public.partner_finishing_services (category_id, approval_status, is_listed, display_order);
CREATE INDEX IF NOT EXISTS idx_pfs_partner ON public.partner_finishing_services (partner_id);

-- Guard: partners cannot approve themselves, move a service between categories,
-- or change review fields. New partner rows always start as 'pending'.
CREATE OR REPLACE FUNCTION public.protect_partner_finishing_service_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at := NOW();

    -- service_role / migrations, and finishing admins, are trusted
    IF auth.uid() IS NULL OR public.is_finishing_admin() THEN
        IF TG_OP = 'UPDATE' AND NEW.approval_status IS DISTINCT FROM OLD.approval_status AND auth.uid() IS NOT NULL THEN
            NEW.reviewed_by := auth.uid();
            NEW.reviewed_at := NOW();
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.approval_status := 'pending';
        NEW.admin_note := NULL;
        NEW.reviewed_by := NULL;
        NEW.reviewed_at := NULL;
        RETURN NEW;
    END IF;

    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
        RAISE EXCEPTION 'A finishing service cannot be moved to another partner or category.';
    END IF;

    NEW.approval_status := OLD.approval_status;
    NEW.admin_note := OLD.admin_note;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.display_order := OLD.display_order;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_partner_finishing_service_review ON public.partner_finishing_services;
CREATE TRIGGER trg_protect_partner_finishing_service_review
BEFORE INSERT OR UPDATE ON public.partner_finishing_services
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_finishing_service_review();

ALTER TABLE public.partner_finishing_services ENABLE ROW LEVEL SECURITY;

-- Public: only approved + listed services of active partners in visible categories
DROP POLICY IF EXISTS "Public view approved partner finishing services" ON public.partner_finishing_services;
CREATE POLICY "Public view approved partner finishing services"
ON public.partner_finishing_services FOR SELECT
USING (
    approval_status = 'approved'
    AND is_listed = TRUE
    AND public.partner_is_active(partner_id)
    AND EXISTS (SELECT 1 FROM public.finishing_categories c WHERE c.id = category_id AND c.is_visible = TRUE)
);

DROP POLICY IF EXISTS "Partners view own finishing services" ON public.partner_finishing_services;
CREATE POLICY "Partners view own finishing services"
ON public.partner_finishing_services FOR SELECT TO authenticated
USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners create own finishing services" ON public.partner_finishing_services;
CREATE POLICY "Partners create own finishing services"
ON public.partner_finishing_services FOR INSERT TO authenticated
WITH CHECK (
    partner_id = auth.uid()
    AND public.current_partner_is_finishing_provider()
);

DROP POLICY IF EXISTS "Partners update own finishing services" ON public.partner_finishing_services;
CREATE POLICY "Partners update own finishing services"
ON public.partner_finishing_services FOR UPDATE TO authenticated
USING (partner_id = auth.uid())
WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners delete own non-approved finishing services" ON public.partner_finishing_services;
CREATE POLICY "Partners delete own non-approved finishing services"
ON public.partner_finishing_services FOR DELETE TO authenticated
USING (partner_id = auth.uid() AND approval_status <> 'approved');

DROP POLICY IF EXISTS "Finishing admins manage partner finishing services" ON public.partner_finishing_services;
CREATE POLICY "Finishing admins manage partner finishing services"
ON public.partner_finishing_services FOR ALL TO authenticated
USING (public.is_finishing_admin())
WITH CHECK (public.is_finishing_admin());

-- ---------------------------------------------------------------------------
-- 4. Backfill: legacy self-declared capabilities become PENDING services
--    (nothing becomes public until an admin approves it)
-- ---------------------------------------------------------------------------
INSERT INTO public.partner_finishing_services (partner_id, category_id, title_ar, title_en, description_ar, description_en, approval_status)
SELECT DISTINCT ON (pc.partner_id, mapped.category_id)
    pc.partner_id,
    mapped.category_id,
    c.name_ar,
    c.name_en,
    COALESCE(p.description_ar, ''),
    COALESCE(p.description_en, ''),
    'pending'
FROM public.partner_capabilities pc
JOIN public.partners p ON p.id = pc.partner_id AND p.type = 'finishing'
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN legacy IN ('architectural', 'design_3d') THEN 'design_3d'
        WHEN legacy IN ('consultation') THEN 'consultation'
        WHEN legacy IN ('turnkey', 'commercial', 'renovation', 'mep_specialized', 'smart_home') THEN 'turnkey'
        ELSE NULL
    END AS category_id
    FROM unnest(COALESCE(pc.categories, ARRAY[]::TEXT[])) AS legacy
) mapped
JOIN public.finishing_categories c ON c.id = mapped.category_id
WHERE mapped.category_id IS NOT NULL
ON CONFLICT (partner_id, category_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Tender invitations (explicit; used by Phase 4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finishing_request_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'invited',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_finishing_request_invitation UNIQUE (request_id, partner_id),
    CONSTRAINT chk_fri_status CHECK (status IN ('invited', 'declined', 'withdrawn'))
);
CREATE INDEX IF NOT EXISTS idx_fri_partner ON public.finishing_request_invitations (partner_id, status);

ALTER TABLE public.finishing_request_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners view own invitations" ON public.finishing_request_invitations;
CREATE POLICY "Partners view own invitations"
ON public.finishing_request_invitations FOR SELECT TO authenticated
USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners decline own invitations" ON public.finishing_request_invitations;
CREATE POLICY "Partners decline own invitations"
ON public.finishing_request_invitations FOR UPDATE TO authenticated
USING (partner_id = auth.uid())
WITH CHECK (partner_id = auth.uid() AND status IN ('invited', 'declined'));

DROP POLICY IF EXISTS "Finishing admins manage invitations" ON public.finishing_request_invitations;
CREATE POLICY "Finishing admins manage invitations"
ON public.finishing_request_invitations FOR ALL TO authenticated
USING (public.is_finishing_admin())
WITH CHECK (public.is_finishing_admin());

-- Helper used by the view and quote policies
CREATE OR REPLACE FUNCTION public.partner_can_access_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.requests r
        JOIN public.partners p ON p.id = auth.uid() AND p.status = 'active'
        WHERE r.id = p_request_id
          AND (
              r.assigned_to = auth.uid()
              OR (r.payload->>'partnerId') = auth.uid()::text
              OR EXISTS (
                  SELECT 1 FROM public.finishing_request_invitations i
                  WHERE i.request_id = r.id AND i.partner_id = auth.uid() AND i.status = 'invited'
              )
          )
    );
$$;
REVOKE ALL ON FUNCTION public.partner_can_access_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_can_access_request(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6A. SECURITY: partner_leads_view — partners only see requests they are
--     assigned to, invited to, or have won. Select list unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.partner_leads_view AS
SELECT 
    r.id,
    r.type,
    r.status,
    -- Requester Name Masking
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role::text LIKE '%_manager')
            )
        )
        THEN r.requester_name
        ELSE 'عميل المنصة (مناقصة)'
    END AS requester_name,
    -- Requester Phone Masking
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role::text LIKE '%_manager')
            )
        )
        THEN r.requester_phone
        ELSE NULL
    END AS requester_phone,
    -- Requester Email Masking
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role::text LIKE '%_manager')
            )
        )
        THEN r.requester_email
        ELSE NULL
    END AS requester_email,
    r.assigned_to,
    -- Safe explicit payload projection
    CASE 
        WHEN auth.role() = 'authenticated' AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.finishing_quotes fq 
                WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
            ) 
            OR EXISTS (
                SELECT 1 FROM public.partners p 
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role::text LIKE '%_manager')
            )
        )
        THEN r.payload
        ELSE jsonb_build_object(
            'serviceType', r.payload->>'serviceType',
            'serviceTitle', r.payload->>'serviceTitle',
            'category', r.payload->>'category',
            'tierDetails', r.payload->'tierDetails',
            'pricingModel', r.payload->>'pricingModel',
            'estimatedCost', r.payload->'estimatedCost',
            'dimensions', r.payload->>'dimensions',
            'itemCategory', r.payload->>'itemCategory',
            'propertyArea', COALESCE(r.payload->'propertyArea', r.payload->'area', (r.payload->'tierDetails'->>'area')::jsonb),
            'propertyId', r.payload->>'propertyId',
            'propertyTitle', r.payload->>'propertyTitle',
            'designStage', r.payload->>'designStage',
            'status', COALESCE(r.payload->>'status', r.status),
            'contactTime', r.payload->>'contactTime'
        )
    END AS payload,
    r.created_at,
    r.updated_at
FROM public.requests r
WHERE auth.role() = 'authenticated'
AND (
    -- 1. Platform administrators / managers
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role::text LIKE '%_manager')
    )
    -- 2. Active partner that is assigned or explicitly invited
    OR public.partner_can_access_request(r.id)
    -- 3. Awarded contractor on accepted quote
    OR EXISTS (
        SELECT 1 FROM public.finishing_quotes fq
        WHERE fq.request_id = r.id
        AND fq.partner_id = auth.uid()
        AND fq.status = 'accepted'
    )
);

REVOKE ALL ON public.partner_leads_view FROM anon, public;
GRANT SELECT ON public.partner_leads_view TO authenticated;

-- ---------------------------------------------------------------------------
-- 6B. SECURITY: quotes can only be submitted/edited for accessible requests.
--     Read/admin policies are (re)created here too so the migration is
--     self-contained (production had RLS enabled with no quote policies).
-- ---------------------------------------------------------------------------
ALTER TABLE public.finishing_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view and manage all finishing quotes" ON public.finishing_quotes;
CREATE POLICY "Admins view and manage all finishing quotes"
ON public.finishing_quotes FOR ALL TO authenticated
USING (public.is_finishing_admin())
WITH CHECK (public.is_finishing_admin());

DROP POLICY IF EXISTS "Partners view own quotes" ON public.finishing_quotes;
CREATE POLICY "Partners view own quotes"
ON public.finishing_quotes FOR SELECT TO authenticated
USING (auth.uid() = partner_id);

DROP POLICY IF EXISTS "Customers view quotes for own requests" ON public.finishing_quotes;
CREATE POLICY "Customers view quotes for own requests"
ON public.finishing_quotes FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requests
        WHERE requests.id = finishing_quotes.request_id
        AND (
            (requests.customer_id IS NOT NULL AND requests.customer_id = auth.uid())
            OR requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

DROP POLICY IF EXISTS "Partners delete own non_accepted quotes" ON public.finishing_quotes;
CREATE POLICY "Partners delete own non_accepted quotes"
ON public.finishing_quotes FOR DELETE TO authenticated
USING (auth.uid() = partner_id AND status <> 'accepted');

DROP POLICY IF EXISTS "Partners insert own quotes" ON public.finishing_quotes;
CREATE POLICY "Partners insert own quotes"
ON public.finishing_quotes FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = partner_id
    AND public.partner_can_access_request(request_id)
);

DROP POLICY IF EXISTS "Partners update own non_accepted quotes" ON public.finishing_quotes;
CREATE POLICY "Partners update own non_accepted quotes"
ON public.finishing_quotes FOR UPDATE TO authenticated
USING (
    auth.uid() = partner_id
    AND status <> 'accepted'
    AND public.partner_can_access_request(request_id)
)
WITH CHECK (
    auth.uid() = partner_id
    AND status NOT IN ('accepted')
    AND public.partner_can_access_request(request_id)
);

-- ---------------------------------------------------------------------------
-- 6C. SECURITY: finishing_request_history was readable and writable by any
--     authenticated user in production (USING true / WITH CHECK true).
-- ---------------------------------------------------------------------------
ALTER TABLE public.finishing_request_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view finishing request history" ON public.finishing_request_history;
DROP POLICY IF EXISTS "Authenticated users insert finishing request history" ON public.finishing_request_history;

DROP POLICY IF EXISTS "Finishing admins manage request history" ON public.finishing_request_history;
CREATE POLICY "Finishing admins manage request history"
ON public.finishing_request_history FOR ALL TO authenticated
USING (public.is_finishing_admin())
WITH CHECK (public.is_finishing_admin());

DROP POLICY IF EXISTS "Partners view history of accessible requests" ON public.finishing_request_history;
CREATE POLICY "Partners view history of accessible requests"
ON public.finishing_request_history FOR SELECT TO authenticated
USING (public.partner_can_access_request(request_id));

DROP POLICY IF EXISTS "Partners add history to accessible requests" ON public.finishing_request_history;
CREATE POLICY "Partners add history to accessible requests"
ON public.finishing_request_history FOR INSERT TO authenticated
WITH CHECK (public.partner_can_access_request(request_id));

DROP POLICY IF EXISTS "Customers view history of own requests" ON public.finishing_request_history;
CREATE POLICY "Customers view history of own requests"
ON public.finishing_request_history FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = finishing_request_history.request_id
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
        )
    )
);

COMMIT;
