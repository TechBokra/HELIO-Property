-- =============================================================================
-- Neon Read-Only Catalog POC — Test Seed Data (002_catalog_seed.sql)
-- Prerequisite: Run 001_catalog_schema.sql first.
-- Contains:
--   - 1 active developer partner
--   - 1 project linked to that partner
--   - 3 properties linked to that project & partner:
--       1) Published listing (active + published) -> visible publicly everywhere
--       2) Draft listing (draft + draft) -> hidden from public catalog & direct link
--       3) Hidden listing (inactive + archived) -> hidden from public catalog & direct link
-- =============================================================================

BEGIN;

-- 1. Test Developer Partner
INSERT INTO public.partners (
    id,
    email,
    name_en,
    name_ar,
    description_en,
    description_ar,
    image_url,
    type,
    role,
    status,
    subscription_plan,
    display_type,
    contact_methods,
    allowed_cities
)
VALUES (
    '11111111-1111-4111-8111-111111111101',
    'neon-poc-developer@onlyhelio.example',
    'Helio Gate Developments (Neon POC)',
    'بوابة هليو للتطوير العقاري (تجربة نيون)',
    'Verified real estate developer participating in the Neon read-only catalog pilot in New Heliopolis.',
    'مطور عقاري معتمد ضمن تجربة عرض الكتالوج من قاعدة بيانات Neon للقراءة فقط في هليوبوليس الجديدة.',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    'developer',
    'developer_partner',
    'active',
    'enterprise',
    'featured',
    '{"whatsapp":{"enabled":true,"number":"201000000101"},"phone":{"enabled":true,"number":"01000000101"},"form":{"enabled":true}}'::jsonb,
    ARRAY['heliopolis', 'shorouk']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_ar = EXCLUDED.name_ar,
    description_en = EXCLUDED.description_en,
    description_ar = EXCLUDED.description_ar,
    image_url = EXCLUDED.image_url,
    status = EXCLUDED.status,
    contact_methods = EXCLUDED.contact_methods,
    allowed_cities = EXCLUDED.allowed_cities,
    updated_at = NOW();

-- 2. Test Project linked to Partner
INSERT INTO public.projects (
    id,
    partner_id,
    city_id,
    name_en,
    name_ar,
    description_en,
    description_ar,
    image_url,
    features
)
VALUES (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'heliopolis',
    'Al Korba Gardens Residence',
    'كمبوند حدائق الكوربة الجديدة',
    'Integrated residential compound in New Heliopolis featuring green courtyards, 24/7 security, and underground garages.',
    'كمبوند سكني متكامل في هليوبوليس الجديدة يتميز بالمساحات الخضراء والأمن على مدار الساعة والجراجات السفلية.',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    '[
      {"icon":"ParkIcon","text":{"ar":"مساحات خضراء ولاندسكيب","en":"Green Spaces & Landscape"}},
      {"icon":"ShieldCheckIcon","text":{"ar":"أمن وحراسة 24/7","en":"24/7 Security"}},
      {"icon":"SwimmingPoolIcon","text":{"ar":"نادي وحمام سباحة","en":"Clubhouse & Pool"}}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    partner_id = EXCLUDED.partner_id,
    city_id = EXCLUDED.city_id,
    name_en = EXCLUDED.name_en,
    name_ar = EXCLUDED.name_ar,
    description_en = EXCLUDED.description_en,
    description_ar = EXCLUDED.description_ar,
    image_url = EXCLUDED.image_url,
    features = EXCLUDED.features,
    updated_at = NOW();

-- 3A. Published Property (MUST appear on /properties, Home, Project, Partner & direct link)
INSERT INTO public.properties (
    id,
    partner_id,
    project_id,
    city_id,
    title_en,
    title_ar,
    description_en,
    description_ar,
    address_en,
    address_ar,
    main_image,
    gallery,
    status,
    type,
    price,
    area,
    beds,
    baths,
    floor,
    finishing_status,
    amenities,
    location,
    is_in_compound,
    installments_available,
    finance_available,
    delivery_immediate,
    installments_info,
    listing_status,
    publication_status,
    availability_status,
    verification_status,
    is_verified,
    verified_at,
    listing_start_date,
    contact_method,
    reference_number,
    slug,
    source_type
)
VALUES (
    '33333333-3333-4333-8333-333333333301',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'heliopolis',
    'Corner Garden Duplex — Al Korba Gardens',
    'دوبلكس بحديقة ناصية — حدائق الكوربة الجديدة',
    'Spacious 210 sqm corner duplex with private garden, natural light, and flexible 6-year installment plan.',
    'دوبلكس ناصية واسع بمساحة 210 م² مع حديقة خاصة وإطلالة مميزة وتقسيط مرن حتى 6 سنوات.',
    'District 4, New Heliopolis, Cairo',
    'الحي الرابع، هليوبوليس الجديدة، القاهرة',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ]::TEXT[],
    'For Sale',
    'Apartment',
    5400000,
    210,
    3,
    3,
    1,
    'Semi-Finished',
    '{"en":["Garden","Security 24/7","Underground Parking"],"ar":["حديقة خاصة","أمن 24/7","جراج تحت الأرض"]}'::jsonb,
    '{"lat":30.1292,"lng":31.6751}'::jsonb,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    '{"downPayment":540000,"monthlyInstallment":67500,"years":6,"_meta":{"cityId":"heliopolis","publicationStatus":"published","availabilityStatus":"available","verificationStatus":"verified"}}'::jsonb,
    'active',
    'published',
    'available',
    'verified',
    TRUE,
    NOW(),
    NOW() + INTERVAL '10 minutes',
    'platform',
    'NEON-PUB-001',
    'corner-garden-duplex-neon-pub-001',
    'developer'
)
ON CONFLICT (id) DO UPDATE SET
    title_en = EXCLUDED.title_en,
    title_ar = EXCLUDED.title_ar,
    price = EXCLUDED.price,
    listing_status = EXCLUDED.listing_status,
    publication_status = EXCLUDED.publication_status,
    availability_status = EXCLUDED.availability_status,
    is_verified = EXCLUDED.is_verified,
    listing_start_date = EXCLUDED.listing_start_date,
    updated_at = NOW();

-- 3B. Draft Property (MUST NEVER appear publicly on any list or direct link)
INSERT INTO public.properties (
    id,
    partner_id,
    project_id,
    city_id,
    title_en,
    title_ar,
    description_en,
    description_ar,
    address_en,
    address_ar,
    main_image,
    status,
    type,
    price,
    area,
    beds,
    baths,
    finishing_status,
    is_in_compound,
    installments_info,
    listing_status,
    publication_status,
    availability_status,
    verification_status,
    is_verified,
    listing_start_date,
    reference_number,
    slug,
    source_type
)
VALUES (
    '33333333-3333-4333-8333-333333333302',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'heliopolis',
    'Draft Penthouse Unit (Internal Review Only)',
    'بنتهاوس مسودة (للمراجعة الداخلية فقط)',
    'Internal draft unit not yet approved for public display.',
    'وحدة في مرحلة المسودة وغير متاحة للعرض العام.',
    'District 4, New Heliopolis',
    'الحي الرابع، هليوبوليس الجديدة',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    'For Sale',
    'Apartment',
    6800000,
    245,
    4,
    3,
    'Core & Shell',
    TRUE,
    '{"_meta":{"cityId":"heliopolis","publicationStatus":"draft"}}'::jsonb,
    'draft',
    'draft',
    'available',
    'pending',
    FALSE,
    NOW(),
    'NEON-DRF-002',
    'draft-penthouse-neon-drf-002',
    'developer'
)
ON CONFLICT (id) DO UPDATE SET
    listing_status = EXCLUDED.listing_status,
    publication_status = EXCLUDED.publication_status,
    updated_at = NOW();

-- 3C. Hidden / Inactive Property (MUST NEVER appear publicly on any list or direct link)
INSERT INTO public.properties (
    id,
    partner_id,
    project_id,
    city_id,
    title_en,
    title_ar,
    description_en,
    description_ar,
    address_en,
    address_ar,
    main_image,
    status,
    type,
    price,
    area,
    beds,
    baths,
    finishing_status,
    is_in_compound,
    installments_info,
    listing_status,
    publication_status,
    availability_status,
    verification_status,
    is_verified,
    listing_start_date,
    reference_number,
    slug,
    source_type
)
VALUES (
    '33333333-3333-4333-8333-333333333303',
    '11111111-1111-4111-8111-111111111101',
    '22222222-2222-4222-8222-222222222201',
    'heliopolis',
    'Hidden Villa Listing (Archived)',
    'فيلا مخفية (مؤرشفة)',
    'Archived property listing hidden from public view.',
    'إعلان عقار مخفي ومؤرشف ولا يظهر للزوار.',
    'District 4, New Heliopolis',
    'الحي الرابع، هليوبوليس الجديدة',
    'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=80',
    'For Sale',
    'Villa',
    11200000,
    360,
    5,
    4,
    'Fully Finished',
    TRUE,
    '{"_meta":{"cityId":"heliopolis","publicationStatus":"archived"}}'::jsonb,
    'inactive',
    'archived',
    'available',
    'verified',
    TRUE,
    NOW(),
    'NEON-HID-003',
    'hidden-villa-neon-hid-003',
    'developer'
)
ON CONFLICT (id) DO UPDATE SET
    listing_status = EXCLUDED.listing_status,
    publication_status = EXCLUDED.publication_status,
    updated_at = NOW();

COMMIT;
