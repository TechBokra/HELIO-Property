-- =========================================================================
-- MIGRATION: 20260929_finishing_domain_hardening.sql
-- PURPOSE: P0/P1 Production Hardening for Finishing Domain
--          - Persists finishing_milestones table in Supabase
--          - Adds partial unique index for single accepted quote per request
--          - Implements atomic accept_finishing_quote RPC transaction
--          - Locks awarded quotes against modifications
--          - Enforces customer quote visibility & milestone RLS
-- =========================================================================

-- 1. FIX SYNTAX / CLEANUP IN finishing_services & requests (IF NEEDED)
CREATE TABLE IF NOT EXISTS public.finishing_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    category TEXT DEFAULT 'turnkey',
    pricing_model TEXT NOT NULL DEFAULT 'per_sqm',
    base_price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EGP',
    pricing_tiers JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE DATABASE-BACKED FINISHING MILESTONES (P0.1)
CREATE TABLE IF NOT EXISTS public.finishing_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    stage_number INTEGER NOT NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    target_days INTEGER DEFAULT 15,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'delayed'
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    payment_percentage NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'due', 'paid'
    inspector_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_finishing_request_stage UNIQUE (request_id, stage_number),
    CONSTRAINT chk_milestone_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT chk_milestone_payment_pct CHECK (payment_percentage >= 0 AND payment_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_finishing_milestones_req ON public.finishing_milestones(request_id);
CREATE INDEX IF NOT EXISTS idx_finishing_milestones_status ON public.finishing_milestones(status);

-- 3. PREVENT MULTIPLE ACCEPTED QUOTES PER REQUEST (P1.1)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finishing_quotes_single_accepted 
ON public.finishing_quotes (request_id) 
WHERE status = 'accepted';

-- 4. TRIGGER: LOCK AWARDED QUOTES AGAINST MODIFICATION (P1.2)
CREATE OR REPLACE FUNCTION trg_prevent_accepted_quote_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'accepted' THEN
        -- Only super_admin or platform managers can make emergency administrative edits
        IF (NEW.total_price <> OLD.total_price OR 
            NEW.scope_items <> OLD.scope_items OR
            NEW.execution_timeline_days <> OLD.execution_timeline_days OR
            NEW.warranty_months <> OLD.warranty_months) THEN
            RAISE EXCEPTION 'Commercial terms on an accepted quote are permanently locked and cannot be modified.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_accepted_quote_immutable ON public.finishing_quotes;
CREATE TRIGGER check_accepted_quote_immutable
BEFORE UPDATE ON public.finishing_quotes
FOR EACH ROW EXECUTE PROCEDURE trg_prevent_accepted_quote_modification();

-- 5. RLS POLICIES FOR FINISHING MILESTONES (P0.1 & Milestone Auth)
ALTER TABLE public.finishing_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view milestones for own requests" ON public.finishing_milestones;
CREATE POLICY "Customers view milestones for own requests" 
ON public.finishing_milestones FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (
            requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

DROP POLICY IF EXISTS "Assigned partners view own project milestones" ON public.finishing_milestones;
CREATE POLICY "Assigned partners view own project milestones" 
ON public.finishing_milestones FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (
            requests.assigned_to = auth.uid() 
            OR (requests.payload->>'partnerId')::uuid = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Assigned partners update own project milestones" ON public.finishing_milestones;
CREATE POLICY "Assigned partners update own project milestones" 
ON public.finishing_milestones FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (
            requests.assigned_to = auth.uid() 
            OR (requests.payload->>'partnerId')::uuid = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (
            requests.assigned_to = auth.uid() 
            OR (requests.payload->>'partnerId')::uuid = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Admins manage all finishing milestones" ON public.finishing_milestones;
CREATE POLICY "Admins manage all finishing milestones" 
ON public.finishing_milestones FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() 
        AND (role = 'super_admin' OR role = 'platform_finishing_manager' OR role = 'finishing_market_manager')
    )
);

-- 6. RLS: FIX CUSTOMER QUOTE VISIBILITY (P0.2)
DROP POLICY IF EXISTS "Customers view quotes for own requests" ON public.finishing_quotes;
CREATE POLICY "Customers view quotes for own requests" 
ON public.finishing_quotes FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_quotes.request_id 
        AND (
            requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

-- 7. ATOMIC QUOTE AWARD RPC FUNCTION (P0.3)
CREATE OR REPLACE FUNCTION public.accept_finishing_quote(
    p_quote_id UUID,
    p_request_id UUID,
    p_client_name TEXT DEFAULT 'العميل'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quote RECORD;
    v_request RECORD;
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

    -- 2. Authorization check: Requester email must match auth user OR caller must be admin
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

    -- 4. Verify quote is eligible for acceptance
    IF v_quote.status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot accept a previously rejected quote.';
    END IF;

    -- 5. Mark winning quote as accepted
    UPDATE public.finishing_quotes 
    SET status = 'accepted', updated_at = v_now 
    WHERE id = p_quote_id;

    -- 6. Atomically reject all other quotes for this request
    UPDATE public.finishing_quotes 
    SET status = 'rejected', updated_at = v_now 
    WHERE request_id = p_request_id AND id <> p_quote_id;

    -- 7. Update Request to in-progress and assign winning contractor
    UPDATE public.requests 
    SET status = 'in-progress',
        assigned_to = v_quote.partner_id,
        payload = jsonb_set(
            jsonb_set(COALESCE(payload, '{}'::jsonb), '{partnerId}', to_jsonb(v_quote.partner_id::text)),
            '{awardedQuoteId}', to_jsonb(p_quote_id::text)
        ),
        updated_at = v_now 
    WHERE id = p_request_id;

    -- 8. Seed default 5 milestones in database if none exist yet for this request
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

    -- 9. Record history event in finishing_request_history
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
        'partnerName', v_quote.partner_name,
        'totalPrice', v_quote.total_price
    );
END;
$$;
