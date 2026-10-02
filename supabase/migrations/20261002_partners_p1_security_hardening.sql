-- =========================================================================
-- MIGRATION: 20261002_partners_p1_security_hardening.sql
-- PURPOSE: Partners Domain P1 Security Hardening
--          SEC-03: Enable and enforce RLS on public.projects
--          SEC-04: Enforce partner active operational status in:
--                  A. public.partner_leads_view (RFQ visibility)
--                  B. public.finishing_quotes (Quote INSERT and UPDATE)
--                  C. public.accept_finishing_quote (Quote award RPC)
-- =========================================================================

-- =========================================================================
-- PART 1: SEC-03 — ENABLE AND ENFORCE RLS ON public.projects
-- =========================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy
-- Project owner can view their own projects (regardless of status).
-- Public/everyone can view projects of active partners.
-- Admins and real estate managers can view all projects.
DROP POLICY IF EXISTS "Projects select policy" ON public.projects;
DROP POLICY IF EXISTS "Public can view active partner projects" ON public.projects;
DROP POLICY IF EXISTS "Partners view own projects" ON public.projects;
DROP POLICY IF EXISTS "Managers view all projects" ON public.projects;

CREATE POLICY "Projects select policy"
ON public.projects FOR SELECT
USING (
    -- Project owner
    auth.uid() = partner_id
    -- Active public partner project
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = projects.partner_id 
        AND p.status = 'active'
    )
    -- Platform administrators / managers
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin' 
            OR p.role = 'real_estate_market_manager' 
            OR p.role = 'platform_real_estate_manager'
            OR p.role = 'listings_manager'
        )
    )
);

-- 2. INSERT Policy
-- Project owner can insert projects for their own active partner account.
-- Super admins / real estate managers can insert for any partner.
DROP POLICY IF EXISTS "Projects insert policy" ON public.projects;
CREATE POLICY "Projects insert policy"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
    (
        auth.uid() = partner_id 
        AND EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = auth.uid() 
            AND p.status = 'active'
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin' 
            OR p.role = 'real_estate_market_manager' 
            OR p.role = 'platform_real_estate_manager'
        )
    )
);

-- 3. UPDATE Policy
-- Project owner can update their own project (cannot transfer ownership).
-- Super admins / real estate managers can update any project.
DROP POLICY IF EXISTS "Projects update policy" ON public.projects;
CREATE POLICY "Projects update policy"
ON public.projects FOR UPDATE
TO authenticated
USING (
    (
        auth.uid() = partner_id
        AND EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = auth.uid() 
            AND p.status = 'active'
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin' 
            OR p.role = 'real_estate_market_manager' 
            OR p.role = 'platform_real_estate_manager'
        )
    )
)
WITH CHECK (
    (
        auth.uid() = partner_id
        AND EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = auth.uid() 
            AND p.status = 'active'
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin' 
            OR p.role = 'real_estate_market_manager' 
            OR p.role = 'platform_real_estate_manager'
        )
    )
);

-- 4. DELETE Policy
-- Project owner can delete their own project.
-- Super admins can delete any project.
DROP POLICY IF EXISTS "Projects delete policy" ON public.projects;
CREATE POLICY "Projects delete policy"
ON public.projects FOR DELETE
TO authenticated
USING (
    (
        auth.uid() = partner_id
        AND EXISTS (
            SELECT 1 FROM public.partners p 
            WHERE p.id = auth.uid() 
            AND p.status = 'active'
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.role = 'super_admin'
    )
);


-- =========================================================================
-- PART 2: SEC-04 — ENFORCE PARTNER ACTIVE STATUS IN OPERATIONAL WORKFLOWS
-- =========================================================================

-- -------------------------------------------------------------------------
-- A. RFQ VISIBILITY: Enforce active status in public.partner_leads_view
-- -------------------------------------------------------------------------
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
    -- Safe explicit payload projection
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
FROM public.requests r
WHERE auth.role() = 'authenticated'
AND (
    -- 1. Active partner operational tender/RFQ access
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
    )
    -- 2. Platform administrators / managers
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
    -- 3. Assigned partner (to access ongoing assigned requests)
    OR (
        r.assigned_to = auth.uid() 
        OR (r.payload->>'partnerId')::uuid = auth.uid()
    )
    -- 4. Awarded contractor on accepted quote
    OR EXISTS (
        SELECT 1 FROM public.finishing_quotes fq 
        WHERE fq.request_id = r.id 
        AND fq.partner_id = auth.uid() 
        AND fq.status = 'accepted'
    )
);

REVOKE ALL ON public.partner_leads_view FROM anon, public;
GRANT SELECT ON public.partner_leads_view TO authenticated;


-- -------------------------------------------------------------------------
-- B. QUOTE SUBMISSION: Enforce active partner status in public.finishing_quotes
-- -------------------------------------------------------------------------

-- 1. INSERT Policy: Active partners only can submit quotes
DROP POLICY IF EXISTS "Partners insert own quotes" ON public.finishing_quotes;
CREATE POLICY "Partners insert own quotes" 
ON public.finishing_quotes FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = partner_id
    AND EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
    )
);

-- 2. UPDATE Policy: Active partners can update their own unaccepted quotes
DROP POLICY IF EXISTS "Partners update own non_accepted quotes" ON public.finishing_quotes;
CREATE POLICY "Partners update own non_accepted quotes" 
ON public.finishing_quotes FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = partner_id 
    AND status != 'accepted'
    AND EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
    )
)
WITH CHECK (
    auth.uid() = partner_id 
    AND status != 'accepted'
    AND EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.status = 'active'
    )
);


-- -------------------------------------------------------------------------
-- C. QUOTE AWARD: Enforce active partner validation in accept_finishing_quote RPC
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_finishing_quote(
    p_quote_id UUID,
    p_request_id UUID,
    p_client_name TEXT DEFAULT 'العميل'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_quote RECORD;
    v_request RECORD;
    v_partner RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Lock and fetch the request
    SELECT * INTO v_request 
    FROM public.requests 
    WHERE id = p_request_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found: %', p_request_id;
    END IF;

    -- 2. Authorization check
    IF NOT (
        v_request.requester_email = auth.jwt()->>'email' OR 
        (v_request.payload->'requesterInfo'->>'email') = auth.jwt()->>'email' OR
        EXISTS (
            SELECT 1 FROM public.partners 
            WHERE id = auth.uid() 
            AND (role = 'super_admin' OR role = 'platform_finishing_manager')
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to award quote for this request.';
    END IF;

    -- 3. Lock and fetch the target quote
    SELECT * INTO v_quote 
    FROM public.finishing_quotes 
    WHERE id = p_quote_id AND request_id = p_request_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quote not found or does not belong to request.';
    END IF;

    IF v_quote.status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot accept a previously rejected quote.';
    END IF;

    -- 3.1 SEC-04: Verify winning partner exists and is currently active
    SELECT * INTO v_partner
    FROM public.partners
    WHERE id = v_quote.partner_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contractor partner % does not exist.', v_quote.partner_id;
    END IF;

    IF v_partner.status <> 'active' THEN
        RAISE EXCEPTION 'Contractor partner % is not active (current status: %). Cannot award quote to an inactive partner.', v_quote.partner_id, v_partner.status;
    END IF;

    -- 4. Mark winning quote as accepted
    UPDATE public.finishing_quotes 
    SET status = 'accepted', updated_at = v_now 
    WHERE id = p_quote_id;

    -- 5. Atomically reject all other quotes for this request
    UPDATE public.finishing_quotes 
    SET status = 'rejected', updated_at = v_now 
    WHERE request_id = p_request_id AND id <> p_quote_id;

    -- 6. Update Request to in-progress and assign winning contractor
    UPDATE public.requests 
    SET status = 'in-progress',
        assigned_to = v_quote.partner_id,
        payload = jsonb_set(
            jsonb_set(COALESCE(payload, '{}'::jsonb), '{partnerId}', to_jsonb(v_quote.partner_id::text)),
            '{awardedQuoteId}', to_jsonb(p_quote_id::text)
        ),
        updated_at = v_now 
    WHERE id = p_request_id;

    -- 7. Seed default 5 milestones in database if none exist yet for this request
    IF NOT EXISTS (SELECT 1 FROM public.finishing_milestones WHERE request_id = p_request_id) THEN
        INSERT INTO public.finishing_milestones (
            request_id, stage_number, title_ar, title_en, description_ar, description_en, 
            target_days, status, progress_percentage, payment_percentage, payment_status, created_at, updated_at
        ) VALUES 
        (p_request_id, 1, 'المخططات التنفيذية واعتماد التصميم 3D', 'Architectural & Executive MEP Blueprints', 'إعداد المخططات التنفيذية، رسومات 3D وتوزيع نقاط الكهرباء والسباكة واعتماد لوحة العينات.', 15, 'in_progress', 0, 10, 'pending', v_now, v_now),
        (p_request_id, 2, 'تأسيس الكهرباء والسباكة والعزل المائي', 'MEP Rough-ins, Electrical & Plumbing Lines', 'تكسير وتمديد مواسير التغذية والصرف، علب الكهرباء، وتطبيق طبقات العزل المائي واختباره هندسياً.', 25, 'pending', 0, 30, 'pending', v_now, v_now),
        (p_request_id, 3, 'المحارة والجبس بورد وأوتار الأرضيات', 'Plastering, Thermal/Waterproofing & Screed', 'تثبيت الشبك المعدني، الطرطشة والبؤج والأوتار، أعمال المحارة وتأسيس أسقف الجبس بورد.', 20, 'pending', 0, 20, 'pending', v_now, v_now),
        (p_request_id, 4, 'الأرضيات والدهانات وتركيب الأطقم والتشطيب', 'Flooring, Paint, Ceiling & Fixtures', 'تركيب البورسلين والسيراميك، تشطيب الدهانات، تركيب المفاتيح والإنارة والأطقم الصحية والأبواب.', 30, 'pending', 0, 30, 'pending', v_now, v_now),
        (p_request_id, 5, 'المراجعة الفنية وجدول الملاحظات وتسليم المفتاح', 'Final Audit, Snagging List & Key Handover', 'فحص الجودة والمطابقة الهندسية الشاملة، استكمال بنود الملاحظات (Snagging list) وتسليم العميل.', 10, 'pending', 0, 10, 'pending', v_now, v_now);
    END IF;

    -- 8. Record history event in finishing_request_history
    INSERT INTO public.finishing_request_history (
        request_id, action_type, changed_by, new_value, note, created_at
    ) VALUES (
        p_request_id,
        'quote_accepted',
        p_client_name,
        jsonb_build_object(
            'quoteId', p_quote_id,
            'partnerId', v_quote.partner_id,
            'partnerName', v_quote.partner_name,
            'totalPrice', v_quote.total_price,
            'timelineDays', v_quote.execution_timeline_days
        ),
        'تم اعتماد وترسية المقايسة المقدمة من (' || v_quote.partner_name || ') بمبلغ ' || v_quote.total_price || ' ' || COALESCE(v_quote.currency, 'EGP') || ' والبدء في تنفيذ المشروع.',
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'requestId', p_request_id,
        'awardedQuoteId', p_quote_id,
        'partnerId', v_quote.partner_id,
        'totalPrice', v_quote.total_price
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_finishing_quote(UUID, UUID, TEXT) TO authenticated;
