-- Phase 2 acceptance test (run on a replica, inside a transaction that is rolled back):
-- "A request sent from a provider's profile reaches that provider, and the admin and
--  the customer see it with the same reference and status."
BEGIN;
DO $$
DECLARE
    v_svc uuid; v_prov uuid; v_other uuid; v_cust uuid; v_mgr uuid;
    v_req uuid := gen_random_uuid(); v_n int; v_status text;
BEGIN
    SELECT s.id, s.partner_id INTO v_svc, v_prov FROM partner_finishing_services s
      WHERE s.approval_status = 'approved' AND s.is_listed LIMIT 1;
    SELECT id INTO v_other FROM partners WHERE lower(role) = 'finishing_partner' AND id <> v_prov LIMIT 1;
    SELECT id INTO v_cust FROM partners WHERE lower(role) IN ('user', 'customer') LIMIT 1;
    v_mgr := resolve_finishing_manager('heliopolis');

    -- customer submits a direct request; the browser even tries to point it at another partner
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO requests (id, type, status, requester_name, requester_phone, city_id, customer_id, assigned_to, payload)
    VALUES (v_req, 'LEAD', 'new', 'Acceptance', '0100', 'heliopolis', v_cust, v_other,
            jsonb_build_object('requestChannel', 'direct_provider', 'providerServiceId', v_svc, 'partnerId', v_other));
    RESET ROLE;

    IF (SELECT assigned_to FROM requests WHERE id = v_req) IS DISTINCT FROM v_prov THEN
        RAISE EXCEPTION 'FAIL: request not routed to the service provider';
    END IF;

    -- provider sees it and moves it forward
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prov, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_n FROM requests WHERE id = v_req;
    IF v_n <> 1 THEN RAISE EXCEPTION 'FAIL: provider cannot see the request'; END IF;
    UPDATE requests SET status = 'in_progress' WHERE id = v_req;
    RESET ROLE;

    -- another finishing partner cannot see it
    IF v_other IS NOT NULL THEN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        SELECT count(*) INTO v_n FROM requests WHERE id = v_req;
        RESET ROLE;
        IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: another partner can see the request'; END IF;
    END IF;

    -- the finishing manager (admin side) and the customer see the same status
    IF v_mgr IS NOT NULL THEN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mgr, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        SELECT status INTO v_status FROM requests WHERE id = v_req;
        RESET ROLE;
        IF v_status IS DISTINCT FROM 'in_progress' THEN RAISE EXCEPTION 'FAIL: manager sees status %', v_status; END IF;
    END IF;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT status INTO v_status FROM requests WHERE id = v_req;
    RESET ROLE;
    IF v_status IS DISTINCT FROM 'in_progress' THEN RAISE EXCEPTION 'FAIL: customer sees status %', v_status; END IF;

    -- provider was notified with a link to their dashboard
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = v_prov AND link LIKE '/dashboard/leads?id=' || v_req) THEN
        RAISE EXCEPTION 'FAIL: provider not notified';
    END IF;
    RAISE NOTICE 'PASS: direct provider request (ref REQ-%)', upper(left(replace(v_req::text, '-', ''), 8));
END $$;
ROLLBACK;
