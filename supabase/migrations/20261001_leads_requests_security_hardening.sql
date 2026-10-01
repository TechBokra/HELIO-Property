-- =========================================================================
-- MIGRATION: 20261001_leads_requests_security_hardening.sql
-- PURPOSE: Leads & Requests P1 Final Security Hardening
--          P1.1: Harden partner_leads_view with safe explicit projection (no raw payload, no arbitrary PII)
--          P1.2: Harden notifications table INSERT authorization (drop WITH CHECK (true), replace with SECURITY DEFINER RPC and scoped policy)
-- =========================================================================

-- =========================================================================
-- PART 1: P1.1 — HARDEN public.partner_leads_view PAYLOAD & PII PROJECTION
-- =========================================================================

-- Recreate view with explicit safe projection for unassigned / non-awarded partners
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
    -- Payload Security Projection
    -- If caller is assigned partner, awarded contractor, or platform manager: return full payload.
    -- If unassigned / bidding partner: return ONLY safe tender metadata, NEVER raw JSONB or arbitrary customer PII.
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
FROM public.requests r;

-- Grant SELECT only to authenticated users (anonymous cannot read partner_leads_view)
REVOKE ALL ON public.partner_leads_view FROM anon, public;
GRANT SELECT ON public.partner_leads_view TO authenticated;


-- =========================================================================
-- PART 2: P1.2 — HARDEN public.notifications INSERT AUTHORIZATION
-- =========================================================================

-- 1. Drop arbitrary and insecure INSERT policies on public.notifications
DROP POLICY IF EXISTS "Authenticated users create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert notifications" ON public.notifications;

-- 2. Create least-privilege direct INSERT policy:
-- Authenticated users may insert notifications ONLY addressed to themselves OR if they are platform super admin / managers
CREATE POLICY "Users insert self notifications or managers insert any" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
);

-- 3. Create trusted SECURITY DEFINER RPC function for controlled, system-generated notification delivery
-- Uses fixed secure search_path = public, pg_temp to prevent privilege escalation.
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
    -- A: If caller is authenticated, check their role or relationship
    IF v_caller_id IS NOT NULL THEN
        SELECT (role = 'super_admin'), (role LIKE '%_manager')
        INTO v_is_super_admin, v_is_manager
        FROM public.partners 
        WHERE id = v_caller_id;

        -- Authorized if:
        -- - Sending to self
        -- - Super Admin or Platform Manager
        -- - Target is super_admin (e.g. user requesting review / payment verification)
        -- - Or caller is a partner notifying an assigned manager
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
        -- B: Anonymous caller (e.g. unauthenticated public user submitting an inquiry/lead or payment review)
        -- Only allow notifying platform managers or super_admins regarding public actions
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

-- Grant EXECUTE permission to anon and authenticated for controlled notification delivery
GRANT EXECUTE ON FUNCTION public.send_system_notification(UUID, JSONB, TEXT) TO anon, authenticated;
