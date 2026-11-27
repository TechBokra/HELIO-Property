-- Fixtures required by multi_city_rls_test.sql (run first, in the same test database)
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-4000-8000-000000000001', 'mc-super@test.local'),
    ('00000000-0000-4000-8000-000000000002', 'mc-shorouk@test.local'),
    ('00000000-0000-4000-8000-000000000003', 'mc-partner@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.partners (id, email, name_en, name_ar, type, role, status, allowed_cities) VALUES
    ('00000000-0000-4000-8000-000000000001', 'mc-super@test.local', 'Super', 'سوبر', 'admin', 'super_admin', 'active', ARRAY['*']),
    ('00000000-0000-4000-8000-000000000002', 'mc-shorouk@test.local', 'Shorouk Manager', 'مدير الشروق', 'admin', 'platform_real_estate_manager', 'active', ARRAY['shorouk']),
    ('00000000-0000-4000-8000-000000000003', 'mc-partner@test.local', 'Helio Partner', 'شريك هليو', 'developer', 'developer_partner', 'active', ARRAY['heliopolis'])
ON CONFLICT (id) DO NOTHING;
