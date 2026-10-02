-- ==========================================
-- ONLY HELIO - DATABASE SCHEMA & ERD
-- ==========================================
-- ERD Summary:
-- partners (1) <--- (N) projects
-- partners (1) <--- (N) properties
-- projects (1) <--- (N) properties
-- partners (1) <--- (N) portfolio_items
-- requests (1) <--- (N) request_messages
-- partners (1) <--- (N) notifications
-- partners (1) <--- (N) transactions
-- property_types, finishing_statuses, amenities (Lookup tables)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE public.partner_role AS ENUM (
    'super_admin', 'developer_partner', 'finishing_partner', 'agency_partner',
    'customer',
    'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
    'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
    'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
);

CREATE TYPE public.partner_status AS ENUM ('active', 'pending', 'disabled', 'rejected', 'approved');
CREATE TYPE public.listing_status AS ENUM ('active', 'inactive', 'draft', 'sold');
CREATE TYPE public.request_type AS ENUM ('PARTNER_APPLICATION', 'PROPERTY_LISTING_REQUEST', 'LEAD', 'CONTACT_MESSAGE', 'PROPERTY_INQUIRY');

-- 3. TABLES

-- Lookup: Property Types
CREATE TABLE IF NOT EXISTS public.property_types (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL
);

-- Lookup: Finishing Statuses
CREATE TABLE IF NOT EXISTS public.finishing_statuses (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    applicable_to TEXT[] DEFAULT '{}'
);

-- Lookup: Amenities
CREATE TABLE IF NOT EXISTS public.amenities (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    applicable_to TEXT[] DEFAULT '{}'
);

-- Main: Partners (Profiles)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    description_en TEXT,
    description_ar TEXT,
    image_url TEXT,
    type TEXT NOT NULL DEFAULT 'agency', -- Matches frontend PartnerType
    role partner_role DEFAULT 'agency_partner',
    status partner_status DEFAULT 'pending',
    subscription_plan TEXT DEFAULT 'basic',
    subscription_end_date TIMESTAMPTZ,
    display_type TEXT DEFAULT 'standard',
    contact_methods JSONB DEFAULT '{"whatsapp": {"enabled": false, "number": ""}, "phone": {"enabled": false, "number": ""}, "form": {"enabled": true}}',
    parent_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    custom_permissions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Projects (Developers only)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    image_url TEXT,
    features JSONB DEFAULT '[]', -- [{icon: string, text: {ar: string, en: string}}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Properties
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    address_en TEXT,
    address_ar TEXT,
    main_image TEXT,
    gallery TEXT[] DEFAULT '{}',
    status TEXT NOT NULL, -- 'For Sale', 'For Rent'
    type TEXT NOT NULL, -- Matches property_types.id
    price NUMERIC NOT NULL,
    area NUMERIC NOT NULL,
    beds INTEGER DEFAULT 0,
    baths INTEGER DEFAULT 0,
    floor INTEGER,
    finishing_status TEXT, -- Matches finishing_statuses.id
    amenities JSONB DEFAULT '{"en": [], "ar": []}',
    location JSONB DEFAULT '{"lat": 30.12, "lng": 31.62}',
    is_in_compound BOOLEAN DEFAULT FALSE,
    installments_available BOOLEAN DEFAULT FALSE,
    finance_available BOOLEAN DEFAULT FALSE,
    delivery_immediate BOOLEAN DEFAULT TRUE,
    delivery_date DATE,
    installments_info JSONB, -- {downPayment, monthlyInstallment, years}
    listing_status listing_status DEFAULT 'active',
    listing_start_date TIMESTAMPTZ DEFAULT NOW(),
    listing_end_date TIMESTAMPTZ,
    contact_method TEXT DEFAULT 'platform',
    owner_phone TEXT,
    reference_number TEXT,
    slug TEXT,
    source_type TEXT DEFAULT 'partner_direct', -- 'developer', 'broker', 'partner_direct', 'platform_admin', 'direct_owner', 'owner_public'
    publication_status TEXT DEFAULT 'draft', -- 'draft', 'pending_review', 'published', 'rejected', 'archived'
    availability_status TEXT DEFAULT 'available', -- 'available', 'reserved', 'sold'
    verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    price_updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_price_confirmed_at TIMESTAMPTZ,
    last_availability_confirmed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    source_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Property Audit History
CREATE TABLE IF NOT EXISTS public.property_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    changed_by TEXT NOT NULL,
    change_type TEXT,
    field_name TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Portfolio Items (Finishing partners)
CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    category_en TEXT NOT NULL,
    category_ar TEXT NOT NULL,
    image_url TEXT NOT NULL,
    price NUMERIC,
    dimensions TEXT,
    availability TEXT DEFAULT 'Made to Order',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Decoration Categories
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

-- Main: Canonical Finishing Services
CREATE TABLE IF NOT EXISTS public.finishing_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    category TEXT DEFAULT 'turnkey', -- turnkey, architectural, consultation, commercial, renovation
    pricing_model TEXT DEFAULT 'per_sqm', -- per_sqm, fixed_package, custom_quote
    base_price NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    pricing_tiers JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    target_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Requests (CRM)
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type request_type NOT NULL,
    status TEXT DEFAULT 'new',
    requester_name TEXT NOT NULL,
    requester_phone TEXT NOT NULL,
    requester_email TEXT,
    assigned_to UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Request Messages (Thread/Timeline)
CREATE TABLE IF NOT EXISTS public.request_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    sender TEXT NOT NULL, -- 'client', 'partner', 'admin', 'system'
    sender_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'message', -- 'message', 'note'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message JSONB NOT NULL, -- {ar, en}
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'EGP',
    type TEXT NOT NULL, -- 'subscription_fee', 'listing_fee', etc.
    description TEXT,
    method TEXT NOT NULL, -- 'card', 'instapay', 'wallet'
    status TEXT DEFAULT 'pending',
    reference_number TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CMS: Site Content & Configurations
CREATE TABLE IF NOT EXISTS public.site_content (
    key TEXT PRIMARY KEY,
    content JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer: Favorites (P1)
CREATE TABLE IF NOT EXISTS public.customer_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'property', -- 'property', 'service', 'portfolio'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_favorite_item UNIQUE(user_id, item_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_customer_favorites_user_id ON public.customer_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_item ON public.customer_favorites(item_id, item_type);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own favorites" ON public.customer_favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own favorites" ON public.customer_favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own favorites" ON public.customer_favorites FOR DELETE USING (user_id = auth.uid());


-- Finishing: Execution Milestones (P0.1)
CREATE TABLE IF NOT EXISTS public.finishing_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    stage_number INTEGER NOT NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    target_days INTEGER DEFAULT 15,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'delayed'
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    payment_percentage NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'due', 'paid'
    inspector_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_finishing_request_stage UNIQUE (request_id, stage_number),
    CONSTRAINT chk_milestone_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT chk_milestone_payment_pct CHECK (payment_percentage >= 0 AND payment_percentage <= 100)
);

-- Finishing: Partner Service Capabilities & Geographic Coverage
CREATE TABLE IF NOT EXISTS public.partner_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL UNIQUE,
    categories TEXT[] DEFAULT '{}',
    service_areas TEXT[] DEFAULT '{}',
    min_budget NUMERIC DEFAULT 0,
    max_budget NUMERIC,
    turnkey_capacity INTEGER DEFAULT 5,
    warranty_years INTEGER DEFAULT 2,
    has_in_house_architects BOOLEAN DEFAULT TRUE,
    is_verified_contractor BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finishing: Quotes & Bids
CREATE TABLE IF NOT EXISTS public.finishing_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    partner_name TEXT NOT NULL,
    total_price NUMERIC NOT NULL,
    price_per_sqm NUMERIC,
    currency TEXT DEFAULT 'EGP',
    execution_timeline_days INTEGER NOT NULL,
    warranty_months INTEGER DEFAULT 24,
    scope_items JSONB DEFAULT '[]'::jsonb,
    terms_and_conditions TEXT,
    status TEXT DEFAULT 'submitted', -- 'draft', 'submitted', 'under_review', 'accepted', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finishing: Request History & Audit Trail
CREATE TABLE IF NOT EXISTS public.finishing_request_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- 'created', 'status_change', 'partner_assigned', 'quote_submitted', 'quote_accepted', 'quote_rejected', 'site_visit_scheduled', 'note_added'
    changed_by TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_properties_partner ON public.properties(partner_id);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON public.properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_source_request ON public.properties(source_request_id);
CREATE INDEX IF NOT EXISTS idx_properties_reference ON public.properties(reference_number);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug);
CREATE INDEX IF NOT EXISTS idx_property_history_prop ON public.property_history(property_id);
CREATE INDEX IF NOT EXISTS idx_finishing_services_active ON public.finishing_services(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_partner_capabilities_partner ON public.partner_capabilities(partner_id);
CREATE INDEX IF NOT EXISTS idx_finishing_quotes_req ON public.finishing_quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_finishing_quotes_partner ON public.finishing_quotes(partner_id);
CREATE INDEX IF NOT EXISTS idx_finishing_req_hist_req ON public.finishing_request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_finishing_milestones_req ON public.finishing_milestones(request_id);
CREATE INDEX IF NOT EXISTS idx_requests_customer_id ON public.requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned ON public.requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_type ON public.requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_requester_email ON public.requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_requests_type_created ON public.requests(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_messages_req ON public.request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_request_history_req ON public.request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_request_history_created ON public.request_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);

-- P0.4 & P1.1: Database View for Masked Partner Leads (PII & Payload Protection)
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
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
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
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
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
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
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
                WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
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
    -- 1. Platform administrators / managers have full operational oversight
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
    -- 2. Assigned partner (to access ongoing assigned requests)
    OR (
        r.assigned_to = auth.uid() 
        OR (r.payload->>'partnerId')::uuid = auth.uid()
    )
    -- 3. Awarded contractor on accepted quote
    OR EXISTS (
        SELECT 1 FROM public.finishing_quotes fq 
        WHERE fq.request_id = r.id 
        AND fq.partner_id = auth.uid() 
        AND fq.status = 'accepted'
    )
    -- 4. Open / Unassigned RFQ: Must be an ACTIVE partner AND satisfy CAPABILITY MATCHING
    OR (
        EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = auth.uid() 
            AND p.status = 'active'
        )
        -- BUS-01 Deterministic Capability Matching:
        -- Hide RFQ if partner has capability configuration that strictly conflicts with the request criteria
        AND NOT EXISTS (
            SELECT 1 FROM public.partner_capabilities pc
            WHERE pc.partner_id = auth.uid()
            AND (
                -- 4A. Specialty/Category Mismatch:
                -- If partner configured categories AND request specifies a category/serviceType
                (
                    pc.categories IS NOT NULL 
                    AND cardinality(pc.categories) > 0
                    AND COALESCE(r.payload->>'category', '') <> ''
                    AND NOT (
                        (r.payload->>'category') = ANY(pc.categories)
                        OR ((r.payload->>'category') = 'finishing' AND ('turnkey' = ANY(pc.categories) OR 'renovation' = ANY(pc.categories)))
                    )
                )
                -- 4B. Geographic Coverage Mismatch:
                -- If partner configured service_areas AND request specifies a serviceArea/location
                OR (
                    pc.service_areas IS NOT NULL 
                    AND cardinality(pc.service_areas) > 0
                    AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') <> ''
                    AND NOT (
                        COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') = ANY(pc.service_areas)
                        OR EXISTS (
                            SELECT 1 FROM unnest(pc.service_areas) sa 
                            WHERE COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%' || sa || '%'
                            OR (sa = 'new_heliopolis' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%هليوبوليس%')
                            OR (sa = 'el_shorouk' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%شروق%')
                            OR (sa = 'new_cairo' AND (COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%تجمع%' OR COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%القاهرة الجديدة%'))
                            OR (sa = 'madinaty' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%مدينتي%')
                            OR (sa = 'mostakbal_city' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%مستقبل%')
                            OR (sa = 'badr_city' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%بدر%')
                            OR (sa = 'new_capital' AND COALESCE(r.payload->>'serviceArea', r.payload->>'areaId', r.payload->>'location', '') ILIKE '%العاصمة%')
                        )
                    )
                )
                -- 4C. Budget Mismatch:
                -- If request has valid numeric cost AND partner has budget bounds
                OR (
                    CASE 
                        WHEN r.payload->>'estimatedCost' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->>'estimatedCost')::numeric
                        WHEN r.payload->'tierDetails'->>'estimatedPrice' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->'tierDetails'->>'estimatedPrice')::numeric
                        ELSE NULL 
                    END IS NOT NULL
                    AND (
                        (pc.min_budget IS NOT NULL AND pc.min_budget > 0 AND (
                            CASE 
                                WHEN r.payload->>'estimatedCost' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->>'estimatedCost')::numeric
                                WHEN r.payload->'tierDetails'->>'estimatedPrice' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->'tierDetails'->>'estimatedPrice')::numeric
                            END < pc.min_budget
                        ))
                        OR
                        (pc.max_budget IS NOT NULL AND pc.max_budget > 0 AND (
                            CASE 
                                WHEN r.payload->>'estimatedCost' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->>'estimatedCost')::numeric
                                WHEN r.payload->'tierDetails'->>'estimatedPrice' ~ '^[0-9]+(\.[0-9]+)?$' THEN (r.payload->'tierDetails'->>'estimatedPrice')::numeric
                            END > pc.max_budget
                        ))
                    )
                )
            )
        )
    )
);

REVOKE ALL ON public.partner_leads_view FROM anon, public;
GRANT SELECT ON public.partner_leads_view TO authenticated;


-- P1.1: Single accepted quote constraint per finishing request
CREATE UNIQUE INDEX IF NOT EXISTS uq_finishing_quotes_single_accepted 
ON public.finishing_quotes (request_id) 
WHERE status = 'accepted';

-- P1.2: Lock awarded quotes against modifications
CREATE OR REPLACE FUNCTION trg_prevent_accepted_quote_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'accepted' THEN
        IF (NEW.total_price <> OLD.total_price OR 
            NEW.scope_items <> OLD.scope_items OR
            NEW.execution_timeline_days <> OLD.execution_timeline_days OR
            NEW.warranty_months <> OLD.warranty_months) THEN
            RAISE EXCEPTION 'Commercial terms on an accepted quote are permanently locked and cannot be modified.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_accepted_quote_immutable ON public.finishing_quotes;
CREATE TRIGGER check_accepted_quote_immutable
BEFORE UPDATE ON public.finishing_quotes
FOR EACH ROW EXECUTE PROCEDURE trg_prevent_accepted_quote_modification();

-- 5. RLS POLICIES

-- Partners (P0.1 Hardened)
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.partners FOR SELECT USING (status = 'active');
CREATE POLICY "Admins view all partners" ON public.partners FOR SELECT TO authenticated USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager' OR p.role = 'service_manager'))
);
CREATE POLICY "Users insert own profile or admins insert any" ON public.partners FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager'))
);
CREATE POLICY "Partners update own profile" ON public.partners FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update partners" ON public.partners FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'partner_relations_manager'))
);

-- Partner Capabilities
ALTER TABLE public.partner_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view partner capabilities" ON public.partner_capabilities FOR SELECT USING (true);
CREATE POLICY "Partners update own capabilities" ON public.partner_capabilities FOR ALL USING (auth.uid() = partner_id);
CREATE POLICY "Admins manage all partner capabilities" ON public.partner_capabilities FOR ALL USING (
    EXISTS (SELECT 1 FROM public.partners WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'platform_finishing_manager' OR role = 'finishing_market_manager'))
);

-- Projects (SEC-03 Hardened)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects select policy" ON public.projects FOR SELECT USING (
    auth.uid() = partner_id
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = projects.partner_id AND p.status = 'active')
    OR EXISTS (
        SELECT 1 FROM public.partners p WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'real_estate_market_manager' OR p.role = 'platform_real_estate_manager' OR p.role = 'listings_manager')
    )
);
CREATE POLICY "Projects insert policy" ON public.projects FOR INSERT TO authenticated WITH CHECK (
    (auth.uid() = partner_id AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND p.status = 'active'))
    OR EXISTS (
        SELECT 1 FROM public.partners p WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'real_estate_market_manager' OR p.role = 'platform_real_estate_manager')
    )
);
CREATE POLICY "Projects update policy" ON public.projects FOR UPDATE TO authenticated USING (
    (auth.uid() = partner_id AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND p.status = 'active'))
    OR EXISTS (
        SELECT 1 FROM public.partners p WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'real_estate_market_manager' OR p.role = 'platform_real_estate_manager')
    )
) WITH CHECK (
    (auth.uid() = partner_id AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND p.status = 'active'))
    OR EXISTS (
        SELECT 1 FROM public.partners p WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'real_estate_market_manager' OR p.role = 'platform_real_estate_manager')
    )
);
CREATE POLICY "Projects delete policy" ON public.projects FOR DELETE TO authenticated USING (
    (auth.uid() = partner_id AND EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND p.status = 'active'))
    OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND p.role = 'super_admin')
);

-- Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public properties are viewable by everyone" ON public.properties FOR SELECT USING (listing_status IN ('active', 'sold'));
CREATE POLICY "Partners manage their own properties" ON public.properties FOR ALL USING (auth.uid() = partner_id);
CREATE POLICY "Admins manage all properties" ON public.properties FOR ALL USING (
    EXISTS (SELECT 1 FROM public.partners WHERE id = auth.uid() AND role = 'super_admin')
);

-- Property History
ALTER TABLE public.property_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all property history" ON public.property_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.partners WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Partners view own property history" ON public.property_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_history.property_id AND partner_id = auth.uid())
);
CREATE POLICY "Authenticated users record property history" ON public.property_history FOR INSERT WITH CHECK (true);

-- Finishing Services
ALTER TABLE public.finishing_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public finishing services are viewable by everyone" ON public.finishing_services FOR SELECT USING (is_active = true);
CREATE POLICY "Admins and managers manage finishing services" ON public.finishing_services FOR ALL USING (
    EXISTS (SELECT 1 FROM public.partners WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'platform_finishing_manager' OR role = 'finishing_market_manager'))
);

-- Finishing Quotes (SEC-04 Hardened)
ALTER TABLE public.finishing_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view quotes for own requests" ON public.finishing_quotes FOR SELECT USING (
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
CREATE POLICY "Partners view own quotes" ON public.finishing_quotes FOR SELECT USING (auth.uid() = partner_id);
CREATE POLICY "Partners insert own quotes" ON public.finishing_quotes FOR INSERT WITH CHECK (
    auth.uid() = partner_id
    AND EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
    )
);
CREATE POLICY "Partners update own non_accepted quotes" ON public.finishing_quotes FOR UPDATE USING (
    auth.uid() = partner_id 
    AND status != 'accepted'
    AND EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
    )
) WITH CHECK (
    auth.uid() = partner_id 
    AND status != 'accepted'
    AND EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
    )
);
CREATE POLICY "Partners delete own non_accepted quotes" ON public.finishing_quotes FOR DELETE USING (auth.uid() = partner_id AND status != 'accepted');
CREATE POLICY "Admins view and manage all finishing quotes" ON public.finishing_quotes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.partners WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'platform_finishing_manager' OR role = 'finishing_market_manager'))
);

-- Finishing Request History
ALTER TABLE public.finishing_request_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all finishing request history" ON public.finishing_request_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.partners WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'platform_finishing_manager' OR role = 'finishing_market_manager'))
);
CREATE POLICY "Partners view history of assigned requests" ON public.finishing_request_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.requests WHERE id = finishing_request_history.request_id AND assigned_to = auth.uid())
);
CREATE POLICY "Customers view history of own requests" ON public.finishing_request_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_request_history.request_id 
        AND (
            requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);
CREATE POLICY "Authenticated users insert finishing request history" ON public.finishing_request_history FOR INSERT WITH CHECK (true);

-- Finishing Milestones (P0.1 & Milestone Auth)
ALTER TABLE public.finishing_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view milestones for own requests" ON public.finishing_milestones FOR SELECT USING (
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
CREATE POLICY "Assigned partners view own project milestones" ON public.finishing_milestones FOR SELECT USING (
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
CREATE POLICY "Assigned partners update own project milestones" ON public.finishing_milestones FOR UPDATE TO authenticated USING (
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
) WITH CHECK (
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
CREATE POLICY "Admins manage all finishing milestones" ON public.finishing_milestones FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND status = 'active'
        AND (role = 'super_admin' OR role = 'platform_finishing_manager' OR role = 'finishing_market_manager')
    )
);

-- Portfolio Items (Decorations & Finishing)
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view portfolio items" ON public.portfolio_items FOR SELECT USING (true);
CREATE POLICY "Partners and admins insert portfolio items" ON public.portfolio_items FOR INSERT WITH CHECK (
    partner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role IN ('decoration_manager', 'platform_finishing_manager')))
);
CREATE POLICY "Partners and admins update portfolio items" ON public.portfolio_items FOR UPDATE USING (
    partner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role IN ('decoration_manager', 'platform_finishing_manager')))
);
CREATE POLICY "Partners and admins delete portfolio items" ON public.portfolio_items FOR DELETE USING (
    partner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role IN ('decoration_manager', 'platform_finishing_manager')))
);

-- Decoration Categories
ALTER TABLE public.decoration_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view decoration categories" ON public.decoration_categories FOR SELECT USING (true);
CREATE POLICY "Admins and decoration managers manage decoration categories" ON public.decoration_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'decoration_manager'))
);

-- Transactions (Financial Operations)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners view own transactions or admins view all" ON public.transactions FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager'))
);
CREATE POLICY "Users insert own transactions or admins insert any" ON public.transactions FOR INSERT WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager'))
);
CREATE POLICY "Admins manage transactions" ON public.transactions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager'))
);
CREATE POLICY "Super admins delete transactions" ON public.transactions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.id = auth.uid() AND p.role = 'super_admin')
);

-- Requests (P0.2 & P0.3 Hardened)
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a request or inquiry" ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers view their own requests" ON public.requests FOR SELECT USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
);
CREATE POLICY "Customers update their own requests" ON public.requests FOR UPDATE USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
) WITH CHECK (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
);
CREATE POLICY "Assigned partners can view their requests" ON public.requests FOR SELECT USING (
    auth.uid() = assigned_to OR (payload->>'partnerId')::uuid = auth.uid()
);
CREATE POLICY "Assigned partners can update their requests" ON public.requests FOR UPDATE USING (
    auth.uid() = assigned_to OR (payload->>'partnerId')::uuid = auth.uid()
) WITH CHECK (
    auth.uid() = assigned_to OR (payload->>'partnerId')::uuid = auth.uid()
);
CREATE POLICY "Admins and managers manage requests" ON public.requests FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin'
            OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND (
                requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                    OR requests.payload->>'category' = 'turnkey'
                    OR requests.payload->>'serviceTitle' ILIKE '%تشطيب%'
                    OR requests.payload->>'serviceTitle' ILIKE '%finishing%'
                )
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role = 'decoration_manager' AND (
                requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('decorations', 'decoration')
                    OR requests.payload->>'serviceTitle' ILIKE '%ديكور%'
                    OR requests.payload->>'serviceTitle' ILIKE '%decor%'
                )
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND (
                requests.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                OR (requests.type = 'LEAD' AND (requests.payload->>'serviceType' = 'property' OR requests.payload->>'propertyId' IS NOT NULL))
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role = 'partner_relations_manager' AND (
                requests.type = 'PARTNER_APPLICATION'
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role IN ('customer_relations_manager', 'service_manager') AND (
                requests.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                OR requests.assigned_to = auth.uid()
            ))
        )
    )
);

-- Request Messages (P0.1 RLS Hardened)
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view messages for own requests" ON public.request_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.type = 'message'
);
CREATE POLICY "Customers insert messages for own requests" ON public.request_messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.sender = 'client'
    AND request_messages.type = 'message'
);
CREATE POLICY "Assigned partners view messages for assigned requests" ON public.request_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (r.assigned_to = auth.uid() OR (r.payload->>'partnerId')::uuid = auth.uid())
    )
);
CREATE POLICY "Assigned partners insert messages for assigned requests" ON public.request_messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (r.assigned_to = auth.uid() OR (r.payload->>'partnerId')::uuid = auth.uid())
    )
    AND request_messages.sender = 'partner'
);
CREATE POLICY "Admins and managers view and insert all request messages" ON public.request_messages FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role IN (
                'super_admin', 'platform_finishing_manager', 'finishing_market_manager',
                'decoration_manager', 'listings_manager', 'platform_real_estate_manager',
                'real_estate_market_manager', 'partner_relations_manager',
                'customer_relations_manager', 'service_manager'
            )
        )
    )
);

-- Notifications (RLS Hardened - P1.2)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users insert self notifications or managers insert any" ON public.notifications FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
);

-- General Request History (P1.1 Audit Trail)
CREATE TABLE IF NOT EXISTS public.request_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL DEFAULT 'System',
    actor_role TEXT,
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    old_assigned_to UUID,
    new_assigned_to UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers view scoped request history" ON public.request_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin'
            OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    (r.type = 'LEAD' AND (
                        r.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                        OR r.payload->>'category' = 'turnkey'
                        OR r.payload->>'serviceTitle' ILIKE '%تشطيب%'
                        OR r.payload->>'serviceTitle' ILIKE '%finishing%'
                    ))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role = 'decoration_manager' AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    (r.type = 'LEAD' AND (
                        r.payload->>'serviceType' IN ('decorations', 'decoration')
                        OR r.payload->>'serviceTitle' ILIKE '%ديكور%'
                        OR r.payload->>'serviceTitle' ILIKE '%decor%'
                    ))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                    OR (r.type = 'LEAD' AND (r.payload->>'serviceType' = 'property' OR r.payload->>'propertyId' IS NOT NULL))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role = 'partner_relations_manager' AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type = 'PARTNER_APPLICATION'
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role IN ('customer_relations_manager', 'service_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                    OR r.assigned_to = auth.uid()
                )
            ))
        )
    )
);

CREATE POLICY "Assigned partners view history of assigned requests" ON public.request_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (r.assigned_to = auth.uid() OR (r.payload->>'partnerId')::uuid = auth.uid())
    )
);

CREATE POLICY "Customers view history of own requests" ON public.request_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (
            r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

-- 6. ATOMIC QUOTE AWARD RPC FUNCTION (P0.3)
CREATE OR REPLACE FUNCTION public.accept_finishing_quote(
    p_quote_id UUID,
    p_request_id UUID,
    p_client_name TEXT DEFAULT 'العميل'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_quote RECORD;
    v_request RECORD;
    v_partner RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Lock and fetch the request
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE id = p_request_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found: %', p_request_id;
    END IF;

    -- 2. Authorization check
    -- Customer owner (by customer_id or email) OR Super Admin OR Platform Finishing Manager
    IF NOT (
        (v_request.customer_id IS NOT NULL AND v_request.customer_id = auth.uid()) OR
        (auth.jwt()->>'email' IS NOT NULL AND (
            v_request.requester_email = auth.jwt()->>'email' OR 
            (v_request.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )) OR
        EXISTS (
            SELECT 1 FROM public.partners 
            WHERE id = auth.uid() 
            AND (role = 'super_admin' OR role = 'platform_finishing_manager')
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to award quote for this request.';
    END IF;

    -- 3. Lock and fetch the target quote
    SELECT * INTO v_quote 
    FROM public.finishing_quotes 
    WHERE id = p_quote_id AND request_id = p_request_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quote not found or does not belong to request.';
    END IF;

    IF v_quote.status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot accept a previously rejected quote.';
    END IF;

    -- 3.1 SEC-04: Verify winning partner exists and is currently active
    SELECT * INTO v_partner
    FROM public.partners
    WHERE id = v_quote.partner_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contractor partner % does not exist.', v_quote.partner_id;
    END IF;

    IF v_partner.status <> 'active' THEN
        RAISE EXCEPTION 'Contractor partner % is not active (current status: %). Cannot award quote to an inactive partner.', v_quote.partner_id, v_partner.status;
    END IF;

    -- 4. Mark winning quote as accepted
    UPDATE public.finishing_quotes 
    SET status = 'accepted', updated_at = v_now 
    WHERE id = p_quote_id;

    -- 5. Atomically reject all other quotes for this request
    UPDATE public.finishing_quotes 
    SET status = 'rejected', updated_at = v_now 
    WHERE request_id = p_request_id AND id <> p_quote_id;

    -- 6. Update Request to in-progress and assign winning contractor
    UPDATE public.requests 
    SET status = 'in-progress',
        assigned_to = v_quote.partner_id,
        payload = jsonb_set(
            jsonb_set(COALESCE(payload, '{}'::jsonb), '{partnerId}', to_jsonb(v_quote.partner_id::text)),
            '{awardedQuoteId}', to_jsonb(p_quote_id::text)
        ),
        updated_at = v_now 
    WHERE id = p_request_id;

    -- 7. Seed default 5 milestones in database if none exist yet for this request
    IF NOT EXISTS (SELECT 1 FROM public.finishing_milestones WHERE request_id = p_request_id) THEN
        INSERT INTO public.finishing_milestones (
            request_id, stage_number, title_ar, title_en, description_ar, description_en, 
            target_days, status, progress_percentage, payment_percentage, payment_status, created_at, updated_at
        ) VALUES 
        (p_request_id, 1, 'المخططات التنفيذية واعتماد التصميم 3D', 'Architectural & Executive MEP Blueprints', 'إعداد المخططات التنفيذية، رسومات 3D وتوزيع نقاط الكهرباء والسباكة واعتماد لوحة العينات.', 15, 'in_progress', 0, 10, 'pending', v_now, v_now),
        (p_request_id, 2, 'تأسيس الكهرباء والسباكة والعزل المائي', 'MEP Rough-ins, Electrical & Plumbing Lines', 'تكسير وتمديد مواسير التغذية والصرف، علب الكهرباء، وتطبيق طبقات العزل المائي واختباره هندسياً.', 25, 'pending', 0, 30, 'pending', v_now, v_now),
        (p_request_id, 3, 'المحارة والجبس بورد وأوتار الأرضيات', 'Plastering, Thermal/Waterproofing & Screed', 'تثبيت الشبك المعدني، الطرطشة والبؤج والأوتار، أعمال المحارة وتأسيس أسقف الجبس بورد.', 20, 'pending', 0, 20, 'pending', v_now, v_now),
        (p_request_id, 4, 'الأرضيات والدهانات وتركيب الأطقم والتشطيب', 'Flooring, Paint, Ceiling & Fixtures', 'تركيب البورسلين والسيراميك، تشطيب الدهانات، تركيب المفاتيح والإنارة والأطقم الصحية والأبواب.', 30, 'pending', 0, 30, 'pending', v_now, v_now),
        (p_request_id, 5, 'المراجعة الفنية وجدول الملاحظات وتسليم المفتاح', 'Final Audit, Snagging List & Key Handover', 'فحص الجودة والمطابقة الهندسية الشاملة، استكمال بنود الملاحظات (Snagging list) وتسليم العميل.', 10, 'pending', 0, 10, 'pending', v_now, v_now);
    END IF;

    -- 8. Record history event in finishing_request_history
    INSERT INTO public.finishing_request_history (
        request_id, action_type, changed_by, new_value, note, created_at
    ) VALUES (
        p_request_id,
        'quote_accepted',
        p_client_name,
        jsonb_build_object(
            'quoteId', p_quote_id,
            'partnerId', v_quote.partner_id,
            'partnerName', v_quote.partner_name,
            'totalPrice', v_quote.total_price,
            'timelineDays', v_quote.execution_timeline_days
        ),
        'تم اعتماد وترسية المقايسة المقدمة من (' || v_quote.partner_name || ') بمبلغ ' || v_quote.total_price || ' ' || COALESCE(v_quote.currency, 'EGP') || ' والبدء في تنفيذ المشروع.',
        v_now
    );

    -- 9. P1: Emit in-app notifications to contractor partner and customer
    -- Contractor notification
    INSERT INTO public.notifications (
        user_id, 
        message, 
        link, 
        is_read, 
        created_at
    ) VALUES (
        v_quote.partner_id,
        jsonb_build_object(
            'ar', 'تهانينا! تم اعتماد عرضك لمشروع التشطيب وتعيينك مقاولاً للمشروع بقيمة ' || v_quote.total_price || ' ج.م.',
            'en', 'Congratulations! Your quote for the finishing project was awarded for ' || v_quote.total_price || ' EGP.'
        ),
        '/dashboard/leads',
        false,
        v_now
    );

    -- Customer notification
    IF v_request.customer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id, 
            message, 
            link, 
            is_read, 
            created_at
        ) VALUES (
            v_request.customer_id,
            jsonb_build_object(
                'ar', 'تم اعتماد عرض شركة ' || COALESCE(v_partner.name_ar, 'المقاول') || ' بنجاح وبدء مراحل تنفيذ المشروع.',
                'en', 'Contractor quote by ' || COALESCE(v_partner.name_en, 'Contractor') || ' was successfully awarded and milestones are active.'
            ),
            '/my-dashboard/requests',
            false,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'requestId', p_request_id,
        'awardedQuoteId', p_quote_id,
        'partnerId', v_quote.partner_id,
        'partnerName', v_quote.partner_name,
        'totalPrice', v_quote.total_price
    );
END;
$$;

-- P1.2: Trusted SECURITY DEFINER RPC function for controlled, system-generated notification delivery
CREATE OR REPLACE FUNCTION public.send_system_notification(
    p_user_id UUID,
    p_message JSONB,
    p_link TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_super_admin BOOLEAN := FALSE;
    v_is_manager BOOLEAN := FALSE;
    v_target_exists BOOLEAN := FALSE;
    v_new_id UUID := uuid_generate_v4();
    v_now TIMESTAMPTZ := NOW();
    v_notification RECORD;
BEGIN
    -- 1. Ensure target user exists
    SELECT EXISTS (SELECT 1 FROM public.partners WHERE id = p_user_id) INTO v_target_exists;
    IF NOT v_target_exists THEN
        RAISE EXCEPTION 'Target recipient partner does not exist: %', p_user_id;
    END IF;

    -- 2. Ensure message is a valid JSON object with language keys
    IF p_message IS NULL OR jsonb_typeof(p_message) <> 'object' THEN
        RAISE EXCEPTION 'Invalid notification message format. Expected JSON object with {ar, en}.';
    END IF;

    -- 3. Validate caller authorization
    IF v_caller_id IS NOT NULL THEN
        SELECT (role = 'super_admin'), (role LIKE '%_manager')
        INTO v_is_super_admin, v_is_manager
        FROM public.partners 
        WHERE id = v_caller_id;

        IF NOT (
            v_caller_id = p_user_id 
            OR COALESCE(v_is_super_admin, FALSE) 
            OR COALESCE(v_is_manager, FALSE)
            OR EXISTS (SELECT 1 FROM public.partners WHERE id = p_user_id AND role = 'super_admin')
            OR EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE (r.assigned_to = v_caller_id OR (r.payload->>'partnerId')::uuid = v_caller_id)
                AND (r.assigned_to = p_user_id OR (r.payload->>'managerId')::uuid = p_user_id)
            )
        ) THEN
            RAISE EXCEPTION 'Not authorized to send notification to user %', p_user_id;
        END IF;
    ELSE
        -- Anonymous caller
        IF NOT EXISTS (
            SELECT 1 FROM public.partners 
            WHERE id = p_user_id AND (role = 'super_admin' OR role LIKE '%_manager')
        ) THEN
            RAISE EXCEPTION 'Anonymous callers may only notify platform managers or administrators.';
        END IF;
    END IF;

    -- 4. Insert notification into table
    INSERT INTO public.notifications (
        id, user_id, message, link, is_read, created_at
    ) VALUES (
        v_new_id, p_user_id, p_message, p_link, FALSE, v_now
    ) RETURNING * INTO v_notification;

    RETURN jsonb_build_object(
        'id', v_notification.id,
        'userId', v_notification.user_id,
        'message', v_notification.message,
        'link', v_notification.link,
        'isRead', v_notification.is_read,
        'createdAt', v_notification.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_system_notification(UUID, JSONB, TEXT) TO anon, authenticated;

-- 7. TRIGGERS FOR TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_finishing_services_updated_at BEFORE UPDATE ON public.finishing_services FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_partner_capabilities_updated_at BEFORE UPDATE ON public.partner_capabilities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_finishing_quotes_updated_at BEFORE UPDATE ON public.finishing_quotes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_finishing_milestones_updated_at BEFORE UPDATE ON public.finishing_milestones FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- P0.1 (SEC-01): Guard Privileged Fields on public.partners
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
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role::text INTO v_caller_role
    FROM public.partners
    WHERE id = v_caller_id;

    v_is_super_admin := (v_caller_role = 'super_admin');
    v_is_relations_manager := (v_caller_role = 'partner_relations_manager');

    IF v_is_super_admin THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.role IS NOT NULL AND NEW.role::text NOT IN ('agency_partner', 'finishing_partner', 'developer_partner', 'customer') THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can assign administrative partner roles (attempted %).', NEW.role;
        END IF;

        IF NEW.type IS NOT NULL AND NEW.type IN (
            'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
            'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
            'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can create administrative account types.';
        END IF;

        IF NEW.custom_permissions IS NOT NULL AND array_length(NEW.custom_permissions, 1) > 0 THEN
            RAISE EXCEPTION 'Unauthorized: custom permissions can only be granted by a super admin.';
        END IF;

        IF NOT v_is_relations_manager THEN
            IF NEW.role::text = 'customer' THEN
                NEW.status := 'active'::partner_status;
            ELSIF NEW.status IS NOT NULL AND NEW.status::text IN ('active', 'approved') AND v_caller_id = NEW.id THEN
                NEW.status := 'pending'::partner_status;
            END IF;
            IF NEW.subscription_plan IS NOT NULL AND NEW.subscription_plan NOT IN ('basic', 'commission') THEN
                NEW.subscription_plan := 'basic';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner role (attempted % -> %).', OLD.role, NEW.role;
        END IF;

        IF NEW.custom_permissions IS DISTINCT FROM OLD.custom_permissions THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify custom permissions.';
        END IF;

        IF NEW.type IS DISTINCT FROM OLD.type THEN
            IF NEW.type IN (
                'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
                'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
                'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
            ) OR NOT v_is_relations_manager THEN
                RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner account type.';
            END IF;
        END IF;

        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify partner status (attempted % -> %).', OLD.status, NEW.status;
            END IF;
        END IF;

        IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan) OR (NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date) THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify subscription plan or expiration date.';
            END IF;
        END IF;

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

DROP TRIGGER IF EXISTS trigger_protect_partner_privileged_fields ON public.partners;
CREATE TRIGGER trigger_protect_partner_privileged_fields
BEFORE INSERT OR UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.protect_partner_privileged_fields();


-- P1.1: Automatic Request Mutation Audit Logging Trigger
CREATE OR REPLACE FUNCTION trg_log_request_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT := 'System';
    v_actor_role TEXT := 'system';
BEGIN
    IF v_actor_id IS NOT NULL THEN
        SELECT name_en, role INTO v_actor_name, v_actor_role FROM public.partners WHERE id = v_actor_id;
        IF v_actor_name IS NULL THEN
            v_actor_name := COALESCE(auth.jwt()->>'email', 'Authenticated User');
        END IF;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.request_history (
            request_id, actor_id, actor_name, actor_role, action,
            new_status, new_assigned_to, metadata, note, created_at
        ) VALUES (
            NEW.id, v_actor_id, v_actor_name, v_actor_role, 'created',
            NEW.status, NEW.assigned_to, jsonb_build_object('type', NEW.type),
            'تم إنشاء الطلب في النظام', NOW()
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
            INSERT INTO public.request_history (
                request_id, actor_id, actor_name, actor_role,
                action, old_status, new_status, old_assigned_to, new_assigned_to,
                metadata, note, created_at
            ) VALUES (
                NEW.id, v_actor_id, v_actor_name, v_actor_role,
                CASE 
                    WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'reassigned'
                    ELSE 'status_changed'
                END,
                OLD.status, NEW.status, OLD.assigned_to, NEW.assigned_to,
                jsonb_build_object('type', NEW.type),
                CASE 
                    WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'تمت إعادة تعيين مسؤول الطلب'
                    ELSE 'تحديث حالة الطلب إلى: ' || NEW.status
                END,
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS log_request_mutation_trigger ON public.requests;
CREATE TRIGGER log_request_mutation_trigger
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW EXECUTE PROCEDURE trg_log_request_mutation();

-- P0: Automatic Customer Identity Binding Trigger
CREATE OR REPLACE FUNCTION public.set_request_customer_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        IF NEW.customer_id IS NULL THEN
            NEW.customer_id := auth.uid();
        END IF;

        IF NEW.requester_email IS NULL OR NEW.requester_email = '' THEN
            NEW.requester_email := auth.jwt()->>'email';
        END IF;

        IF NEW.payload IS NOT NULL THEN
            IF NEW.payload ? 'requesterInfo' THEN
                NEW.payload := jsonb_set(
                    NEW.payload,
                    '{requesterInfo,email}',
                    to_jsonb(COALESCE(NEW.requester_email, auth.jwt()->>'email', ''))
                );
                NEW.payload := jsonb_set(
                    NEW.payload,
                    '{requesterInfo,customerId}',
                    to_jsonb(COALESCE(NEW.customer_id::text, auth.uid()::text, ''))
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_request_customer_identity ON public.requests;
CREATE TRIGGER trigger_set_request_customer_identity
BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.set_request_customer_identity();

-- P0: Protect Request Privileged Fields Trigger
CREATE OR REPLACE FUNCTION public.protect_request_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_staff BOOLEAN := FALSE;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = v_caller_id 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    ) INTO v_is_staff;

    IF v_is_staff THEN
        RETURN NEW;
    END IF;

    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id AND OLD.customer_id IS NOT NULL THEN
        NEW.customer_id := OLD.customer_id;
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
        NEW.assigned_to := OLD.assigned_to;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_request_privileged_fields ON public.requests;
CREATE TRIGGER trigger_protect_request_privileged_fields
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.protect_request_privileged_fields();

-- P0: Protect Finishing Milestone Financial Fields Trigger
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
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

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




