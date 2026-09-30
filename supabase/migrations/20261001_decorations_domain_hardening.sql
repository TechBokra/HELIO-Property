-- =========================================================================
-- MIGRATION: 20261001_decorations_domain_hardening.sql
-- PURPOSE: Decorations & Interior Design Domain Production Hardening
--          - Create public.decoration_categories with RLS
--          - Enable RLS on public.portfolio_items with public view & partner/admin management
--          - Seed initial canonical decoration categories
--          - Performance indexes on portfolio_items & decoration_categories
-- =========================================================================

-- 1. CREATE DECORATION CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.decoration_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS ON DECORATION CATEGORIES
ALTER TABLE public.decoration_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view decoration categories" ON public.decoration_categories;
CREATE POLICY "Public view decoration categories" 
ON public.decoration_categories FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins and decoration managers manage decoration categories" ON public.decoration_categories;
CREATE POLICY "Admins and decoration managers manage decoration categories" 
ON public.decoration_categories FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'decoration_manager')
    )
);

-- 3. ENABLE RLS ON PORTFOLIO ITEMS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view portfolio items" ON public.portfolio_items;
CREATE POLICY "Public view portfolio items" 
ON public.portfolio_items FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Partners and admins insert portfolio items" ON public.portfolio_items;
CREATE POLICY "Partners and admins insert portfolio items" 
ON public.portfolio_items FOR INSERT 
WITH CHECK (
    partner_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role IN ('decoration_manager', 'platform_finishing_manager'))
    )
);

DROP POLICY IF EXISTS "Partners and admins update portfolio items" ON public.portfolio_items;
CREATE POLICY "Partners and admins update portfolio items" 
ON public.portfolio_items FOR UPDATE 
USING (
    partner_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role IN ('decoration_manager', 'platform_finishing_manager'))
    )
);

DROP POLICY IF EXISTS "Partners and admins delete portfolio items" ON public.portfolio_items;
CREATE POLICY "Partners and admins delete portfolio items" 
ON public.portfolio_items FOR DELETE 
USING (
    partner_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role IN ('decoration_manager', 'platform_finishing_manager'))
    )
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_portfolio_items_partner ON public.portfolio_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_created ON public.portfolio_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decoration_categories_order ON public.decoration_categories(display_order);

-- 5. SEED INITIAL PRODUCTION DECORATION CATEGORIES IF NONE EXIST
INSERT INTO public.decoration_categories (id, name_ar, name_en, description_ar, description_en, display_order)
SELECT 
    'a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c'::uuid,
    'منحوتات جدارية',
    'Wall Sculptures',
    'نصمم وننفذ منحوتات فنية مباشرة على الجدران لتحويلها إلى قطعة فنية فريدة. استلهم من أعمالنا أو زودنا بفكرتك الخاصة لنحولها إلى واقع.',
    'We design and execute art sculptures directly on walls to transform them into unique masterpieces. Get inspired by our work or provide your own idea to bring it to life.',
    1
WHERE NOT EXISTS (SELECT 1 FROM public.decoration_categories WHERE name_en = 'Wall Sculptures');

INSERT INTO public.decoration_categories (id, name_ar, name_en, description_ar, description_en, display_order)
SELECT 
    'b2c3d4e5-f6a7-48b9-ac1d-2e3f4a5b6c7d'::uuid,
    'لوحات كانفس',
    'Canvas Paintings',
    'مجموعة فريدة من اللوحات الفنية التي تناسب جميع الأذواق والمساحات، منفذة بأيدي فنانين محترفين.',
    'A unique collection of art paintings to suit all tastes and spaces, created by professional artists.',
    2
WHERE NOT EXISTS (SELECT 1 FROM public.decoration_categories WHERE name_en = 'Canvas Paintings');

INSERT INTO public.decoration_categories (id, name_ar, name_en, description_ar, description_en, display_order)
SELECT 
    'c3d4e5f6-a7b8-49ca-bd2e-3f4a5b6c7d8e'::uuid,
    'تحف وديكورات',
    'Antiques & Decor',
    'تشكيلة مختارة من التحف وقطع الديكور التي تضيف لمسة من الأناقة والفخامة لمساحتك.',
    'A curated selection of antiques and decor pieces that add a touch of elegance and luxury to your space.',
    3
WHERE NOT EXISTS (SELECT 1 FROM public.decoration_categories WHERE name_en = 'Antiques & Decor');
