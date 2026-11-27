-- =============================================================================
-- Test Suite: supabase/tests/multi_city_rls_test.sql
-- Purpose: Verify Multi-City Governance RLS & Trigger Hardening against Postgres
--          after applying 20261127_multi_city_governance_rls.sql.
-- Usage:   Run inside an isolated test transaction against a Supabase/Postgres
--          test instance containing seeded roles and auth.users fixtures.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_super_admin_id UUID := '00000000-0000-4000-8000-000000000001';
    v_shorouk_mgr_id UUID := '00000000-0000-4000-8000-000000000002';
    v_partner_helio  UUID := '00000000-0000-4000-8000-000000000003';
    v_paused_city_id TEXT := 'test_paused_city';
    v_visible_count  INTEGER;
    v_sqlstate       TEXT;
    v_errmsg         TEXT;
BEGIN
    -- Seed test cities (1 active, 1 paused)
    INSERT INTO public.cities (id, slug, subdomain, name_ar, name_en, brand_title_ar, brand_title_en, is_active)
    VALUES
        (v_paused_city_id, v_paused_city_id, 'test-paused.only-property.com', 'مدينة اختبار متوقفة', 'Paused Test City', 'أونلي متوقفة', 'ONLY PAUSED', FALSE)
    ON CONFLICT (id) DO UPDATE SET is_active = FALSE;

    -- Seed test properties in heliopolis (active) and paused city (active listing inside paused city)
    INSERT INTO public.properties (id, city_id, partner_id, title_ar, title_en, listing_status, status, price, area, type)
    VALUES
        ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'heliopolis', v_partner_helio, 'عقار هليو', 'Helio Prop', 'active', 'available', 1000000, 150, 'شقة'),
        ('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', v_paused_city_id, v_partner_helio, 'عقار مدينة متوقفة', 'Paused City Prop', 'active', 'available', 2000000, 150, 'شقة')
    ON CONFLICT (id) DO NOTHING;

    -- Seed test requests in heliopolis and shorouk
    INSERT INTO public.requests (id, city_id, type, status, requester_name, requester_phone, payload)
    VALUES
        ('cccccccc-3333-4333-8333-cccccccccccc', 'heliopolis', 'PROPERTY_INQUIRY', 'new', 'Helio Lead', '01000000001', '{}'::jsonb),
        ('dddddddd-4444-4444-8444-dddddddddddd', 'shorouk', 'PROPERTY_INQUIRY', 'new', 'Shorouk Lead', '01000000002', '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- TEST 1: Public anon cannot see paused cities or properties inside paused cities
    -- -------------------------------------------------------------------------
    PERFORM set_config('role', 'anon', TRUE);
    PERFORM set_config('request.jwt.claims', '{}', TRUE);

    SELECT COUNT(*) INTO v_visible_count FROM public.cities WHERE id = v_paused_city_id;
    IF v_visible_count <> 0 THEN
        RAISE EXCEPTION 'TEST 1A FAILED: anon could read paused city %', v_paused_city_id;
    END IF;

    SELECT COUNT(*) INTO v_visible_count FROM public.properties WHERE id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
    IF v_visible_count <> 0 THEN
        RAISE EXCEPTION 'TEST 1B FAILED: anon could read active property in paused city';
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 2: Paused city rejects public request intake with 42501 RLS violation
    -- -------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.requests (id, city_id, type, status, requester_name, requester_phone, payload)
        VALUES ('eeeeeeee-5555-4555-8555-eeeeeeeeeeee', v_paused_city_id, 'CONTACT_MESSAGE', 'new', 'Blocked Visitor', '01000000003', '{}'::jsonb);
        RAISE EXCEPTION 'TEST 2 FAILED: Expected RLS rejection (42501) on paused city intake';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        IF v_sqlstate <> '42501' THEN
            RAISE EXCEPTION 'TEST 2 FAILED: Expected SQLSTATE 42501 but got % (%)', v_sqlstate, v_errmsg;
        END IF;
    END;

    -- -------------------------------------------------------------------------
    -- TEST 3: City-scoped manager (allowed_cities = ['shorouk']) sees shorouk
    --         requests ONLY and is blocked from heliopolis requests & cross-city update
    -- -------------------------------------------------------------------------
    PERFORM set_config('role', 'authenticated', TRUE);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_shorouk_mgr_id, 'role', 'authenticated')::text, TRUE);

    SELECT COUNT(*) INTO v_visible_count FROM public.requests WHERE id = 'cccccccc-3333-4333-8333-cccccccccccc';
    IF v_visible_count <> 0 THEN
        RAISE EXCEPTION 'TEST 3A FAILED: Shorouk manager viewed Heliopolis request';
    END IF;

    SELECT COUNT(*) INTO v_visible_count FROM public.requests WHERE id = 'dddddddd-4444-4444-8444-dddddddddddd';
    IF v_visible_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3B FAILED: Shorouk manager could not view Shorouk request';
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 4: Non-super_admin partner cannot escalate own allowed_cities
    -- -------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_partner_helio, 'role', 'authenticated')::text, TRUE);

    BEGIN
        UPDATE public.partners
        SET allowed_cities = ARRAY['*']::TEXT[]
        WHERE id = v_partner_helio;
        RAISE EXCEPTION 'TEST 4 FAILED: Partner self-escalation of allowed_cities succeeded unexpectedly';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        IF v_sqlstate <> '42501' THEN
            RAISE EXCEPTION 'TEST 4 FAILED: Expected SQLSTATE 42501 but got % (%)', v_sqlstate, v_errmsg;
        END IF;
    END;

    -- -------------------------------------------------------------------------
    -- TEST 5: Non-super_admin cannot toggle or create cities in public.cities
    -- -------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_shorouk_mgr_id, 'role', 'authenticated')::text, TRUE);

    BEGIN
        INSERT INTO public.cities (id, slug, subdomain, name_ar, name_en, brand_title_ar, brand_title_en)
        VALUES ('rogue', 'rogue', 'rogue.only-property.com', 'مدينة', 'Rogue', 'ر', 'ROGUE');
        RAISE EXCEPTION 'TEST 5 FAILED: Non-super_admin inserted city unexpectedly';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        IF v_sqlstate <> '42501' THEN
            RAISE EXCEPTION 'TEST 5 FAILED: Expected SQLSTATE 42501 but got % (%)', v_sqlstate, v_errmsg;
        END IF;
    END;

    -- Restore role & verify Super Admin sees paused city
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_super_admin_id, 'role', 'authenticated')::text, TRUE);
    SELECT COUNT(*) INTO v_visible_count FROM public.cities WHERE id = v_paused_city_id;
    IF v_visible_count <> 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Super admin could not read paused city';
    END IF;
END $$;

ROLLBACK;
