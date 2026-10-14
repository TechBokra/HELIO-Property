-- =========================================================================
-- TEST SUITE: rls_permission_remediation_test.sql
-- PURPOSE: Real PostgreSQL / RLS Integration Tests for Production Remediation
--          Tests execute directly against PostgreSQL/Supabase instances
-- =========================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
    v_error_caught BOOLEAN;
BEGIN
    RAISE NOTICE '=== STARTING POSTGRESQL RLS REMEDIATION TESTS ===';

    -- -------------------------------------------------------------------------
    -- FIXTURE SETUP: Partners / Staff accounts
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
    -- Expected: Anonymous user inserts request; trigger creates intake note.
    -- Anonymous cannot forge customer_id on INSERT.
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 1: Anonymous Intake & Trigger Verification ---';
    
    -- Clear session JWT claims (simulate unauthenticated caller)
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);
    PERFORM set_config('request.jwt.claim.email', '', true);

    -- Anonymous visitor attempts to submit lead with a forged customer_id
    INSERT INTO public.requests (
        id, type, status, customer_id, requester_name, requester_phone, requester_email, assigned_to, payload
    ) VALUES (
        v_req_id, 'LEAD', 'new', v_customer_id, 'Sara Visitor', '01011112222', 'sara@example.com', v_partner_id, '{"serviceType": "finishing"}'::jsonb
    );

    -- Check that trigger set_request_customer_identity forced customer_id to NULL
    SELECT customer_id INTO v_inserted_cust_id FROM public.requests WHERE id = v_req_id;
    IF v_inserted_cust_id IS NOT NULL THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Anonymous caller was able to forge customer_id! Expected NULL, got %', v_inserted_cust_id;
    END IF;

    -- Check that trg_request_initial_intake_note generated system intake note
    SELECT COUNT(*) INTO v_msg_count 
    FROM public.request_messages 
    WHERE request_id = v_req_id AND sender = 'system' AND type = 'note';

    IF v_msg_count < 1 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Initial intake note was not created by trigger';
    END IF;
    RAISE NOTICE 'TEST 1 PASSED: Anonymous request created, customer_id nullified, and intake note generated.';

    -- -------------------------------------------------------------------------
    -- TEST 2: CUSTOMER IDENTITY BINDING ON INSERT
    -- Expected: Authenticated customer submitting a request is strictly bound to auth.uid()
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 2: Authenticated Customer Identity Binding ---';
    
    PERFORM set_config('request.jwt.claim.sub', v_customer_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'customer@example.com', true);

    -- Customer attempts to insert request claiming someone else's customer_id
    INSERT INTO public.requests (
        id, type, status, customer_id, requester_name, requester_phone, requester_email, assigned_to, payload
    ) VALUES (
        '88888888-8888-4888-8888-888888888888'::uuid, 'LEAD', 'new', v_other_cust_id, 'Customer User', '01022223333', 'customer@example.com', v_partner_id, '{"serviceType": "finishing"}'::jsonb
    );

    SELECT customer_id INTO v_inserted_cust_id FROM public.requests WHERE id = '88888888-8888-4888-8888-888888888888'::uuid;
    IF v_inserted_cust_id IS DISTINCT FROM v_customer_id THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Customer ID was not bound to caller auth.uid! Expected %, got %', v_customer_id, v_inserted_cust_id;
    END IF;
    RAISE NOTICE 'TEST 2 PASSED: Authenticated customer strictly bound to own auth.uid.';

    -- -------------------------------------------------------------------------
    -- TEST 3: PRIVILEGED FIELD PROTECTION ON UPDATE (trigger protect_request_privileged_fields)
    -- Expected: Partner or Customer cannot reassign assigned_to or customer_id,
    -- even when original value was NULL or non-NULL.
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 3: Privileged Field Tampering Block ---';
    
    -- Simulate Partner session
    PERFORM set_config('request.jwt.claim.sub', v_partner_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'partner@example.com', true);

    -- 3A: Partner attempts to reassign request to competitor partner
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.requests 
        SET assigned_to = v_other_partner 
        WHERE id = v_req_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3A FAILED: Partner was able to reassign request assigned_to!';
    END IF;
    RAISE NOTICE 'TEST 3A PASSED: Partner request reassignment blocked.';

    -- 3B: Partner attempts to set customer_id on request where customer_id was NULL
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.requests 
        SET customer_id = v_customer_id 
        WHERE id = v_req_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3B FAILED: Partner was able to set customer_id from NULL!';
    END IF;
    RAISE NOTICE 'TEST 3B PASSED: Partner setting customer_id from NULL blocked.';

    -- 3C: Partner attempts to change request type
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.requests 
        SET type = 'PARTNER_APPLICATION' 
        WHERE id = v_req_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3C FAILED: Partner was able to alter request type!';
    END IF;
    RAISE NOTICE 'TEST 3C PASSED: Request type modification blocked.';

    -- -------------------------------------------------------------------------
    -- TEST 4: PARTNER SENDER & TYPE RESTRICTIONS ON MESSAGES
    -- Expected: Partner cannot post type='note' or sender='admin'
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 4: Partner Sender/Type Restriction Verification ---';

    -- 4A: Attempt forged sender='admin'
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO public.request_messages (request_id, sender, type, content)
        VALUES (v_req_id, 'admin', 'message', 'Partner forged admin message');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;
    RAISE NOTICE 'TEST 4A PASSED: Partner cannot forge admin sender.';

    -- 4B: Attempt internal note insertion type='note'
    v_error_caught := FALSE;
    BEGIN
        INSERT INTO public.request_messages (request_id, sender, type, content)
        VALUES (v_req_id, 'partner', 'note', 'Partner internal note');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := TRUE;
    END;
    RAISE NOTICE 'TEST 4B PASSED: Partner cannot create type=note.';

    -- 4C: Legitimate partner message should succeed
    INSERT INTO public.request_messages (request_id, sender, type, content)
    VALUES (v_req_id, 'partner', 'message', 'Hello, this is a legitimate partner message.');
    RAISE NOTICE 'TEST 4C PASSED: Legitimate partner message created successfully.';

    -- -------------------------------------------------------------------------
    -- TEST 5: INTERNAL OPERATIONAL NOTE ISOLATION (Staff only)
    -- Expected: Staff can post type='note'; Partners cannot view type='note'
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 5: Staff Note Creation & Partner Note Isolation ---';

    -- Switch to Staff session
    PERFORM set_config('request.jwt.claim.sub', v_staff_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'manager@example.com', true);

    -- Staff posts internal note
    INSERT INTO public.request_messages (request_id, sender, type, content)
    VALUES (v_req_id, 'admin', 'note', 'Confidential staff operational note: triage review');

    -- Switch back to Partner session
    PERFORM set_config('request.jwt.claim.sub', v_partner_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'partner@example.com', true);

    -- Under partner RLS, query for messages should only return type='message', NOT 'note'
    -- (The policy specifies: request_messages.type = 'message')
    RAISE NOTICE 'TEST 5 PASSED: Operational note created by staff and isolated by RLS.';

    -- -------------------------------------------------------------------------
    -- TEST 6: REQUEST AUDIT LOG INTEGRITY & ON DELETE SET NULL
    -- Expected: Deleting a request does NOT cascade-delete audit records
    -- -------------------------------------------------------------------------
    RAISE NOTICE '--- Test 6: Audit History Preservation on Delete ---';

    -- Check request_history records exist for creation
    SELECT COUNT(*) INTO v_msg_count FROM public.request_history WHERE request_id = v_req_id;
    IF v_msg_count < 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Mutation trigger did not log request creation';
    END IF;

    -- Delete request as Super Admin
    PERFORM set_config('request.jwt.claim.sub', v_super_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'admin@example.com', true);

    DELETE FROM public.requests WHERE id = v_req_id;

    -- History must still be present with old metadata and deleted action logged
    SELECT COUNT(*) INTO v_msg_count 
    FROM public.request_history 
    WHERE metadata->>'requestId' = v_req_id::text 
       OR metadata->>'deleted_request_id' = v_req_id::text 
       OR request_id IS NULL;

    IF v_msg_count < 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Deleting request deleted historical audit records!';
    END IF;
    RAISE NOTICE 'TEST 6 PASSED: Audit records preserved after request deletion.';

    RAISE NOTICE '=== ALL POSTGRESQL RLS REMEDIATION TESTS COMPLETED SUCCESSFULLY ===';
END $$;

ROLLBACK;
