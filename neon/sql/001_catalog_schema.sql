-- =============================================================================
-- Neon Read-Only Catalog POC — Schema (001_catalog_schema.sql)
-- Target Neon Project: Only-property (polished-pine-64921728)
-- Purpose: Minimal read-only catalog schema matching frontend Property, Project,
--          and Partner mappers without requiring Supabase auth schema.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Partners (public profile fields required by catalog cards, details & profile page)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    description_en TEXT,
    description_ar TEXT,
    image_url TEXT,
    type TEXT NOT NULL DEFAULT 'developer',
    role TEXT NOT NULL DEFAULT 'developer_partner',
    status TEXT NOT NULL DEFAULT 'active',
    subscription_plan TEXT NOT NULL DEFAULT 'enterprise',
    subscription_end_date TIMESTAMPTZ,
    display_type TEXT NOT NULL DEFAULT 'featured',
    contact_methods JSONB NOT NULL DEFAULT '{"whatsapp":{"enabled":false,"number":""},"phone":{"enabled":false,"number":""},"form":{"enabled":true}}'::jsonb,
    allowed_cities TEXT[] NOT NULL DEFAULT ARRAY['heliopolis']::TEXT[],
    parent_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Projects (linked to partner)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    city_id TEXT NOT NULL DEFAULT 'heliopolis',
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    image_url TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Properties (linked to partner & project, with publication/visibility fields)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    city_id TEXT NOT NULL DEFAULT 'heliopolis',
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    address_en TEXT,
    address_ar TEXT,
    main_image TEXT,
    gallery TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    status TEXT NOT NULL DEFAULT 'For Sale',
    type TEXT NOT NULL DEFAULT 'Apartment',
    price NUMERIC NOT NULL DEFAULT 0,
    area NUMERIC NOT NULL DEFAULT 0,
    beds INTEGER NOT NULL DEFAULT 0,
    baths INTEGER NOT NULL DEFAULT 0,
    floor INTEGER,
    finishing_status TEXT,
    amenities JSONB NOT NULL DEFAULT '{"en":[],"ar":[]}'::jsonb,
    location JSONB NOT NULL DEFAULT '{"lat":30.1286,"lng":31.6744}'::jsonb,
    is_in_compound BOOLEAN NOT NULL DEFAULT FALSE,
    installments_available BOOLEAN NOT NULL DEFAULT FALSE,
    finance_available BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_immediate BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_date DATE,
    installments_info JSONB,
    listing_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (listing_status IN ('active', 'inactive', 'draft', 'sold')),
    publication_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (publication_status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
    availability_status TEXT NOT NULL DEFAULT 'available'
        CHECK (availability_status IN ('available', 'reserved', 'sold')),
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    listing_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    listing_end_date TIMESTAMPTZ,
    contact_method TEXT NOT NULL DEFAULT 'platform',
    owner_phone TEXT,
    reference_number TEXT,
    slug TEXT,
    source_type TEXT NOT NULL DEFAULT 'developer',
    price_updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_price_confirmed_at TIMESTAMPTZ,
    last_availability_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neon_properties_visibility_city
    ON public.properties (listing_status, publication_status, city_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_neon_properties_project_id
    ON public.properties (project_id);

CREATE INDEX IF NOT EXISTS idx_neon_properties_partner_id
    ON public.properties (partner_id);

CREATE INDEX IF NOT EXISTS idx_neon_projects_partner_city
    ON public.projects (partner_id, city_id);

COMMIT;
