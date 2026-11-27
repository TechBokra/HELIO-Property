-- =============================================================================
-- Test Suite: supabase/tests/finishing_marketplace_rls_test.sql
-- Purpose: Verify 20261128_finishing_marketplace_foundation.sql
--   - only approved + listed services are public
--   - partners cannot self-approve or move services between categories
--   - disabling one service hides the provider from that category only
--   - partner_leads_view only shows assigned / invited requests
--   - quotes can only be submitted for assigned / invited requests
-- Usage: run inside a Supabase/Postgres test instance; everything is rolled back.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_admin   UUID := '10000000-0000-4000-8000-000000000001';
    v_pa      UUID := '10000000-0000-4000-8000-000000000002'; -- finishing company A (design + turnkey)
    v_pb      UUID := '10000000-0000-4000-8000-000000000003'; -- independent engineer B
    v_agency  UUID := '10000000-0000-4000-8000-000000000004'; -- real-estate agency (not finishing)
    v_r1      UUID := '20000000-0000-4000-8000-000000000001'; -- assigned to A
    v_r2      UUID := '20000000-0000-4000-8000-000000000002'; -- open tender, B invited
    v_svc_design  UUID;
    v_svc_turnkey UUID;
    v_count   INTEGER;
    v_status  TEXT;
    v_failed  BOOLEAN;
BEGIN
    INSERT INTO auth.users (id, email) VALUES
        (v_admin, 'admin@test.local'), (v_pa, 'a@test.local'), (v_pb, 'b@test.local'), (v_agency, 'agency@test.local')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.partners (id, email, name_en, name_ar, type, role, status, profile_kind) VALUES
        (v_admin,  'admin@test.local',  'Admin',     'أدمن',   'admin',     'super_admin',       'active', 'company'),
        (v_pa,     'a@test.local',      'Company A', 'شركة أ', 'finishing', 'finishing_partner', 'active', 'company'),
        (v_pb,     'b@test.local',      'Eng. B',    'م. ب',   'finishing', 'finishing_partner', 'active', 'engineer'),
        (v_agency, 'agency@test.local', 'Agency',    'وكالة',  'agency',    'agency_partner',    'active', 'company')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.requests (id, type, status, requester_name, requester_phone, assigned_to, payload) VALUES
        (v_r1, 'LEAD', 'new', 'Client One', '01000000001', v_pa, '{"serviceType":"finishing"}'::jsonb),
        (v_r2, 'LEAD', 'new', 'Client Two', '01000000002', NULL, '{"serviceType":"finishing"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- ---------------------------------------------------------------------
    -- TEST 1: partner cannot self-approve on insert
    -- ---------------------------------------------------------------------
    PERFORM set_config('role', 'authenticated', TRUE);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pa, 'role', 'authenticated')::text, TRUE);

    INSERT INTO public.partner_finishing_services (partner_id, category_id, title_ar, title_en, approval_status)
    VALUES (v_pa, 'design_3d', 'تصميم', 'Design', 'approved') RETURNING id, approval_status INTO v_svc_design, v_status;
    IF v_status <> 'pending' THEN RAISE EXCEPTION 'TEST 1 FAILED: partner self-approved on insert (%)', v_status; END IF;

    INSERT INTO public.partner_finishing_services (partner_id, category_id, title_ar, title_en)
    VALUES (v_pa, 'turnkey', 'تنفيذ', 'Turnkey') RETURNING id INTO v_svc_turnkey;

    -- TEST 2: partner cannot self-approve on update
    UPDATE public.partner_finishing_services SET approval_status = 'approved', title_en = 'Design Studio' WHERE id = v_svc_design;
    SELECT approval_status INTO v_status FROM public.partner_finishing_services WHERE id = v_svc_design;
    IF v_status <> 'pending' THEN RAISE EXCEPTION 'TEST 2 FAILED: partner self-approved on update'; END IF;

    -- TEST 3: partner cannot move a service to another category
    v_failed := FALSE;
    BEGIN
        UPDATE public.partner_finishing_services SET category_id = 'consultation' WHERE id = v_svc_design;
    EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
    END;
    IF NOT v_failed THEN RAISE EXCEPTION 'TEST 3 FAILED: service moved between categories'; END IF;

    -- TEST 4: partner cannot create a service for another partner
    v_failed := FALSE;
    BEGIN
        INSERT INTO public.partner_finishing_services (partner_id, category_id) VALUES (v_pb, 'consultation');
    EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
    END;
    IF NOT v_failed THEN RAISE EXCEPTION 'TEST 4 FAILED: partner created a service for someone else'; END IF;

    -- TEST 5: pending services are not public
    PERFORM set_config('role', 'anon', TRUE);
    PERFORM set_config('request.jwt.claims', '{}', TRUE);
    SELECT COUNT(*) INTO v_count FROM public.partner_finishing_services WHERE partner_id = v_pa;
    IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 5 FAILED: pending services visible to public (%)', v_count; END IF;

    -- TEST 6: admin approves both -> provider appears under both categories
    PERFORM set_config('role', 'authenticated', TRUE);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    UPDATE public.partner_finishing_services SET approval_status = 'approved' WHERE partner_id = v_pa;
    SELECT COUNT(*) INTO v_count FROM public.partner_finishing_services WHERE partner_id = v_pa AND reviewed_by = v_admin;
    IF v_count <> 2 THEN RAISE EXCEPTION 'TEST 6 FAILED: review audit fields not set'; END IF;

    PERFORM set_config('role', 'anon', TRUE);
    PERFORM set_config('request.jwt.claims', '{}', TRUE);
    SELECT COUNT(DISTINCT category_id) INTO v_count FROM public.partner_finishing_services WHERE partner_id = v_pa;
    IF v_count <> 2 THEN RAISE EXCEPTION 'TEST 6 FAILED: expected provider in 2 categories, got %', v_count; END IF;

    -- TEST 7: disabling one service hides the provider from that category only
    PERFORM set_config('role', 'authenticated', TRUE);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    UPDATE public.partner_finishing_services SET approval_status = 'disabled' WHERE id = v_svc_design;

    PERFORM set_config('role', 'anon', TRUE);
    PERFORM set_config('request.jwt.claims', '{}', TRUE);
    SELECT COUNT(*) INTO v_count FROM public.partner_finishing_services WHERE partner_id = v_pa AND category_id = 'design_3d';
    IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 7 FAILED: disabled service still public'; END IF;
    SELECT COUNT(*) INTO v_count FROM public.partner_finishing_services WHERE partner_id = v_pa AND category_id = 'turnkey';
    IF v_count <> 1 THEN RAISE EXCEPTION 'TEST 7 FAILED: other category lost the provider'; END IF;

    -- TEST 8: hidden category hides its services
    PERFORM set_config('role', 'authenticated', TRUE);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    UPDATE public.finishing_categories SET is_visible = FALSE WHERE id = 'turnkey';
    PERFORM set_config('role', 'anon', TRUE);
    PERFORM set_config('request.jwt.claims', '{}', TRUE);
    SELECT COUNT(*) INTO v_count FROM public.partner_finishing_services WHERE category_id = 'turnkey';
    IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 8 FAILED: services of hidden category are public'; END IF;
    SELECT COUNT(*) INTO v_count FROM public.finishing_categories WHERE id = 'turnkey';
    IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 8 FAILED: hidden category is public'; END IF;

    -- ---------------------------------------------------------------------
    -- Tender visibility & quote submission
    -- ---------------------------------------------------------------------
    PERFORM set_config('role', 'authenticated', TRUE);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, TRUE);
    INSERT INTO public.finishing_request_invitations (request_id, partner_id, invited_by) VALUES (v_r2, v_pb, v_admin);

    -- TEST 9: agency partner sees no requests
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_agency, 'role', 'authenticated')::text, TRUE);
    SELECT COUNT(*) INTO v_count FROM public.partner_leads_view WHERE id IN (v_r1, v_r2);
    IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 9 FAILED: unrelated partner sees % requests', v_count; END IF;

    -- TEST 10: invited engineer sees only the invited request
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pb, 'role', 'authenticated')::text, TRUE);
    SELECT COUNT(*) INTO v_count FROM public.partner_leads_view WHERE id = v_r2;
    IF v_count <> 1 THEN RAISE EXCEPTION 'TEST 10 FAILED: invited partner cannot see tender'; END IF;
    SELECT COUNT(*) INTO v_count FROM public.partner_leads_view WHERE id = v_r1;
    IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 10 FAILED: partner sees request assigned to someone else'; END IF;

    -- TEST 11: invited engineer can quote on the tender
    INSERT INTO public.finishing_quotes (request_id, partner_id, partner_name, total_price, execution_timeline_days)
    VALUES (v_r2, v_pb, 'Eng. B', 500000, 60);

    -- TEST 12: uninvited partner cannot quote
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_agency, 'role', 'authenticated')::text, TRUE);
    v_failed := FALSE;
    BEGIN
        INSERT INTO public.finishing_quotes (request_id, partner_id, partner_name, total_price, execution_timeline_days)
        VALUES (v_r1, v_agency, 'Agency', 1, 1);
    EXCEPTION WHEN insufficient_privilege THEN v_failed := TRUE;
    END;
    IF NOT v_failed THEN RAISE EXCEPTION 'TEST 12 FAILED: uninvited partner submitted a quote'; END IF;

    -- TEST 13: assigned partner A cannot quote on tender R2 it was not invited to
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pa, 'role', 'authenticated')::text, TRUE);
    v_failed := FALSE;
    BEGIN
        INSERT INTO public.finishing_quotes (request_id, partner_id, partner_name, total_price, execution_timeline_days)
        VALUES (v_r2, v_pa, 'Company A', 1, 1);
    EXCEPTION WHEN insufficient_privilege THEN v_failed := TRUE;
    END;
    IF NOT v_failed THEN RAISE EXCEPTION 'TEST 13 FAILED: partner quoted on a tender it was not invited to'; END IF;

    -- TEST 14: assigned partner A can quote on its own request
    INSERT INTO public.finishing_quotes (request_id, partner_id, partner_name, total_price, execution_timeline_days)
    VALUES (v_r1, v_pa, 'Company A', 400000, 45);

    RAISE NOTICE 'finishing_marketplace_rls_test: ALL 14 TESTS PASSED';
END $$;

ROLLBACK;
