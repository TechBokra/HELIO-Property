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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main: Requests (CRM)
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    user_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    message JSONB NOT NULL, -- {ar, en}
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
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

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_properties_partner ON public.properties(partner_id);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON public.properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_requests_assigned ON public.requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);

-- 5. RLS POLICIES

-- Partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.partners FOR SELECT USING (status = 'active');
CREATE POLICY "Users can update their own profile" ON public.partners FOR UPDATE USING (auth.uid() = id);

-- Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public properties are viewable by everyone" ON public.properties FOR SELECT USING (listing_status = 'active');
CREATE POLICY "Partners manage their own properties" ON public.properties FOR ALL USING (auth.uid() = partner_id);

-- Requests
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assigned partners can view their requests" ON public.requests FOR SELECT USING (auth.uid() = assigned_to);
CREATE POLICY "Admins can view all requests" ON public.requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.partners WHERE id = auth.uid() AND role = 'super_admin')
);

-- 6. TRIGGERS FOR TIMESTAMPS
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
