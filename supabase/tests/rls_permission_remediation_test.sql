-- =========================================================================
-- TEST SUITE: rls_permission_remediation_test.sql
-- PURPOSE: Real PostgreSQL / RLS Integration Tests for Database Remediation
--
-- EXECUTION ENVIRONMENT & FIXTURE PREREQUISITES:
-- 1. Database Engine: PostgreSQL 14+ / Supabase database instance.
-- 2. Pre-existing Extensions: "pgcrypto" (or gen_random_uuid() support).
-- 3. Pre-existing Tables: public.partners, public.requests,
--    public.request_messages, public.request_history, public.credential_audit_log
--    with migration 20261014_database_permission_remediation.sql applied.
-- 4. Database Roles: 'anon', 'authenticated', 'service_role'.
--    (Pre-flight block below idempotently verifies or defines these roles).
-- 5. Execution Privilege: The runner must connect as a privileged role (e.g.
--    'postgres') with permission to execute SET LOCAL ROLE anon/authenticated.
-- 6. Transactional Safety: Entire suite executes within BEGIN ... ROLLBACK,
--    ensuring zero test artifacts or modifications persist in the database.
-- =========================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pre-flight: Ensure test environment roles exist and are switchable
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;

    -- Grant roles to the current session runner so SET LOCAL ROLE succeeds
    -- Do not silently suppress unexpected failures so that setup errors fail fast and cleanly.
    EXECUTE 'GRANT anon, authenticated, service_role TO ' || quote_ident(current_user);
END $$;

DO $$
DECLARE
    v_customer_id UUID := '11111111-1111-4111-8111-111111111111'::uuid;
    v_other_cust_id UUID := '22222222-2222-4222-8222-222222222222'::uuid;
    v_partner_id UUID := '33333333-3333-4333-8333-333333333333'::uuid;
    v_other_partner UUID := '44444444-4444-4444-8444-444444444444'::uuid;
    v_staff_id UUID := '55555555-5555-4555-8555-555555555555'::uuid;
    v_super_admin_id UUID := '66666666-6666-4666-8666-666666666666'::uuid;
    v_req_id UUID := '77777777-7777-4777-8777-777777777777'::uuid;
    
    v_inserted_cust_id UUID;
    v_msg_count INT;
    v_note_count INT;
    v_del_count INT;
    v_hist_total INT;
    v_null_fk_count INT;
    v_error_caught BOOLEAN;
    v_sqlstate TEXT;
    v_errmsg TEXT;
BEGIN
    RAISE NOTICE '=== STARTING POSTGRESQL RLS REMEDIATION TESTS ===';

    -- -------------------------------------------------------------------------
    -- FIXTURE SETUP: Partners / Staff accounts (performed as administrative user)
    -- -------------------------------------------------------------------------
    INSERT INTO public.partners (id, name_en, email, role, type, status)
    VALUES 
        (v_partner_id, 'Assigned Partner', 'partner@example.com', 'finishing_partner', 'finishing', 'active'),
        (v_other_partner, 'Other Partner', 'other@example.com', 'finishing_partner', 'finishing', 'active'),
        (v_staff_id, 'Platform Finishing Manager', 'manager@example.com', 'platform_finishing_manager', 'finishing', 'active'),
        (v_super_admin_id, 'Super Admin', 'admin@example.com', 'super_admin', 'finishing', 'active')
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role, 
        status = EXCLUDED.status;

    -- -------------------------------------------------------------------------
    -- TEST 1: ANONYMOUS INTAKE & SYSTEM INTAKE NOTE TRIGGER
    -- Genuine RLS execution under ROLE anon.
    -- Expected: Anonymous user inserts request; trigger creates intake note.
    -- Anonymous caller cannot forge customer_id on INSERT.
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 1: Anonymous Intake & Trigger Verification (ROLE anon) ---';
    
    -- Switch to unauthenticated client context
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);
    PERFORM set_config('request.jwt.claim.email', '', true);
    PERFORM set_config('request.jwt.claims', '{"role": "anon"}'::text, true);

    -- Anonymous visitor submits lead with a forged customer_id
    INSERT INTO public.requests (
        id, type, status, customer_id, requester_name, requester_phone, requester_email, assigned_to, payload
    ) VALUES (
        v_req_id, 'LEAD', 'new', v_customer_id, 'Sara Visitor', '01011112222', 'sara@example.com', v_partner_id, '{"serviceType": "finishing"}'::jsonb
    );

    -- Switch back to inspect request state
    EXECUTE 'RESET ROLE';
    SELECT customer_id INTO v_inserted_cust_id FROM public.requests WHERE id = v_req_id;
    IF v_inserted_cust_id IS NOT NULL THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Anonymous caller was able to forge customer_id! Expected NULL, got %', v_inserted_cust_id;
    END IF;

    SELECT COUNT(*) INTO v_msg_count 
    FROM public.request_messages 
    WHERE request_id = v_req_id AND sender = 'system' AND type = 'note';

    IF v_msg_count < 1 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Initial intake note was not created by trigger';
    END IF;
    RAISE NOTICE 'TEST 1 PASSED: Anonymous request created, customer_id nullified, and intake note generated.';

    -- -------------------------------------------------------------------------
    -- TEST 2: CUSTOMER IDENTITY BINDING ON INSERT
    -- Genuine RLS execution under ROLE authenticated.
    -- Expected: Authenticated customer submitting a request is strictly bound to auth.uid()
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 2: Authenticated Customer Identity Binding (ROLE authenticated) ---';
    
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.sub', v_customer_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'customer@example.com', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_customer_id::text, 'role', 'authenticated', 'email', 'customer@example.com')::text, true);

    -- Customer attempts to insert request claiming someone else's customer_id
    INSERT INTO public.requests (
        id, type, status, customer_id, requester_name, requester_phone, requester_email, assigned_to, payload
    ) VALUES (
        '88888888-8888-4888-8888-888888888888'::uuid, 'LEAD', 'new', v_other_cust_id, 'Customer User', '01022223333', 'customer@example.com', v_partner_id, '{"serviceType": "finishing"}'::jsonb
    );

    EXECUTE 'RESET ROLE';
    SELECT customer_id INTO v_inserted_cust_id FROM public.requests WHERE id = '88888888-8888-4888-8888-888888888888'::uuid;
    IF v_inserted_cust_id IS DISTINCT FROM v_customer_id THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Customer ID was not bound to caller auth.uid! Expected %, got %', v_customer_id, v_inserted_cust_id;
    END IF;
    RAISE NOTICE 'TEST 2 PASSED: Authenticated customer strictly bound to own auth.uid.';

    -- -------------------------------------------------------------------------
    -- TEST 3: PRIVILEGED FIELD PROTECTION ON UPDATE (trigger protect_request_privileged_fields)
    -- Genuine RLS execution under ROLE authenticated (as Partner).
    -- Expected: Partner cannot reassign assigned_to or customer_id,
    -- even when original value was NULL or non-NULL.
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 3: Privileged Field Tampering Block (ROLE authenticated, Partner) ---';
    
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.sub', v_partner_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'partner@example.com', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_partner_id::text, 'role', 'authenticated', 'email', 'partner@example.com')::text, true);

    -- 3A: Partner attempts to reassign request to competitor partner
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.requests 
        SET assigned_to = v_other_partner 
        WHERE id = v_req_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        -- The protect_request_privileged_fields trigger explicitly raises P0001 (raise_exception)
        IF v_sqlstate = 'P0001' AND v_errmsg LIKE '%Unauthorized%' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 3A FAILED: Unexpected error caught instead of trigger authorization failure (SQLSTATE %, message: %)', v_sqlstate, v_errmsg;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3A FAILED: Unauthorized update succeeded! Partner was able to reassign request assigned_to.';
    END IF;
    RAISE NOTICE 'TEST 3A PASSED: Partner request reassignment blocked (SQLSTATE P0001 verified).';

    -- 3B: Partner attempts to set customer_id on request where customer_id was NULL
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.requests 
        SET customer_id = v_customer_id 
        WHERE id = v_req_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' AND v_errmsg LIKE '%Unauthorized%' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 3B FAILED: Unexpected error caught instead of trigger authorization failure (SQLSTATE %, message: %)', v_sqlstate, v_errmsg;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3B FAILED: Unauthorized update succeeded! Partner was able to set customer_id from NULL.';
    END IF;
    RAISE NOTICE 'TEST 3B PASSED: Partner setting customer_id from NULL blocked (SQLSTATE P0001 verified).';

    -- 3C: Partner attempts to change request type
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.requests 
        SET type = 'PARTNER_APPLICATION' 
        WHERE id = v_req_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        IF v_sqlstate = 'P0001' AND v_errmsg LIKE '%Unauthorized%' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 3C FAILED: Unexpected error caught instead of trigger authorization failure (SQLSTATE %, message: %)', v_sqlstate, v_errmsg;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3C FAILED: Unauthorized update succeeded! Partner was able to alter request type.';
    END IF;
    RAISE NOTICE 'TEST 3C PASSED: Request type modification blocked (SQLSTATE P0001 verified).';

    -- -------------------------------------------------------------------------
    -- TEST 4: PARTNER SENDER & TYPE RESTRICTIONS ON MESSAGES
    -- Genuine RLS execution under ROLE authenticated (as Partner).
    -- Expected: Partner cannot post type='note' or sender='admin'.
    -- Must fail explicitly if unauthorized insert succeeds; pass only on expected
    -- PostgreSQL RLS denial (SQLSTATE '42501': insufficient_privilege).
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 4: Partner Sender/Type Restriction Verification (ROLE authenticated, Partner) ---';

    -- 4A: Attempt forged sender='admin'
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO public.request_messages (request_id, sender, type, content)
        VALUES (v_req_id, 'admin', 'message', 'Partner forged admin message');
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        IF v_sqlstate = '42501' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 4A FAILED: Unexpected error caught instead of RLS denial (expected SQLSTATE 42501, got %: %)', v_sqlstate, v_errmsg;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 4A FAILED: Unauthorized message insert succeeded! Partner was able to forge admin sender.';
    END IF;
    RAISE NOTICE 'TEST 4A PASSED: Partner cannot forge admin sender (rejected with SQLSTATE 42501 as expected).';

    -- 4B: Attempt internal note insertion type='note'
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO public.request_messages (request_id, sender, type, content)
        VALUES (v_req_id, 'partner', 'note', 'Partner internal note');
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_errmsg = MESSAGE_TEXT;
        IF v_sqlstate = '42501' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 4B FAILED: Unexpected error caught instead of RLS denial (expected SQLSTATE 42501, got %: %)', v_sqlstate, v_errmsg;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 4B FAILED: Unauthorized message insert succeeded! Partner was able to insert message with type=note.';
    END IF;
    RAISE NOTICE 'TEST 4B PASSED: Partner cannot create type=note (rejected with SQLSTATE 42501 as expected).';

    -- 4C: Legitimate partner message should succeed
    INSERT INTO public.request_messages (request_id, sender, type, content)
    VALUES (v_req_id, 'partner', 'message', 'Hello, this is a legitimate partner message.');
    RAISE NOTICE 'TEST 4C PASSED: Legitimate partner message created successfully.';

    -- -------------------------------------------------------------------------
    -- TEST 5: INTERNAL OPERATIONAL NOTE ISOLATION (Staff only)
    -- Expected: Staff can post type='note'; Partners cannot view type='note' under RLS.
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 5: Staff Note Creation & Partner Note Isolation ---';

    -- Switch to Staff session
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.sub', v_staff_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'manager@example.com', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_staff_id::text, 'role', 'authenticated', 'email', 'manager@example.com')::text, true);

    -- Staff posts internal note
    INSERT INTO public.request_messages (request_id, sender, type, content)
    VALUES (v_req_id, 'admin', 'note', 'Confidential staff operational note: triage review');

    -- Switch back to Partner session
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.sub', v_partner_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'partner@example.com', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_partner_id::text, 'role', 'authenticated', 'email', 'partner@example.com')::text, true);

    -- Under partner RLS, query for notes must return 0 rows
    SELECT COUNT(*) INTO v_note_count 
    FROM public.request_messages 
    WHERE request_id = v_req_id AND type = 'note';

    IF v_note_count > 0 THEN
        RAISE EXCEPTION 'TEST 5 FAILED: Partner was able to view internal operational notes! Expected 0 rows, got %', v_note_count;
    END IF;

    -- Under partner RLS, query for ordinary messages must return the legitimate message
    SELECT COUNT(*) INTO v_msg_count 
    FROM public.request_messages 
    WHERE request_id = v_req_id AND type = 'message';

    IF v_msg_count < 1 THEN
        RAISE EXCEPTION 'TEST 5 FAILED: Partner was unable to view legitimate message!';
    END IF;
    RAISE NOTICE 'TEST 5 PASSED: Operational note created by staff and strictly isolated by RLS.';

    -- -------------------------------------------------------------------------
    -- TEST 6: REQUEST AUDIT LOG INTEGRITY & ON DELETE SET NULL
    -- Expected: Deleting a request:
    --   1. Does NOT destroy or cascade-delete the specific request's audit records.
    --   2. Explicitly records the 'deleted' action event for this request.
    --   3. Sets request_id to NULL on the specific request's audit records via ON DELETE SET NULL.
    --   4. Rejects unrelated rows with NULL request_id as proof.
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 6: Audit History Preservation on Delete ---';

    -- Reset to admin/staff to verify pre-delete history
    EXECUTE 'RESET ROLE';
    
    SELECT COUNT(*) INTO v_msg_count 
    FROM public.request_history 
    WHERE request_id = v_req_id 
      AND (metadata->>'requestId' = v_req_id::text OR metadata->>'deleted_request_id' = v_req_id::text);
    
    IF v_msg_count < 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Mutation trigger did not log initial request creation for %', v_req_id;
    END IF;

    -- Delete request as Super Admin under authenticated role
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.sub', v_super_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'admin@example.com', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_super_admin_id::text, 'role', 'authenticated', 'email', 'admin@example.com')::text, true);

    DELETE FROM public.requests WHERE id = v_req_id;

    -- Switch to administrative verification
    EXECUTE 'RESET ROLE';

    -- 6A: Verify the 'deleted' action was recorded specifically for this request
    SELECT COUNT(*) INTO v_del_count
    FROM public.request_history
    WHERE action = 'deleted'
      AND metadata->>'deleted_request_id' = v_req_id::text;

    IF v_del_count < 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Deletion event was not recorded for deleted request %', v_req_id;
    END IF;

    -- 6B: Verify all historical audit rows for this specific request are preserved
    SELECT COUNT(*) INTO v_hist_total
    FROM public.request_history
    WHERE metadata->>'requestId' = v_req_id::text 
       OR metadata->>'deleted_request_id' = v_req_id::text;

    IF v_hist_total < 2 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Historical audit records for request % were destroyed upon deletion! Expected at least 2 records (create + delete), got %', v_req_id, v_hist_total;
    END IF;

    -- 6C: Verify request_id was nullified strictly on these specific rows via ON DELETE SET NULL
    SELECT COUNT(*) INTO v_null_fk_count
    FROM public.request_history
    WHERE (metadata->>'requestId' = v_req_id::text OR metadata->>'deleted_request_id' = v_req_id::text)
      AND request_id IS NULL;

    IF v_null_fk_count != v_hist_total THEN
        RAISE EXCEPTION 'TEST 6 FAILED: ON DELETE SET NULL did not nullify request_id for all rows of request % (expected %, got %)', v_req_id, v_hist_total, v_null_fk_count;
    END IF;

    RAISE NOTICE 'TEST 6 PASSED: Specific audit records preserved, deletion event logged, and foreign key safely set to NULL (v_hist_total=%, v_null_fk_count=%).', v_hist_total, v_null_fk_count;

    RAISE NOTICE '=== ALL POSTGRESQL RLS REMEDIATION TESTS COMPLETED SUCCESSFULLY ===';
END $$;

ROLLBACK;
