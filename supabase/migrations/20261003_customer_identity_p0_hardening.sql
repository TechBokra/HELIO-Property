-- Migration: 20261003_customer_identity_p0_hardening.sql
-- Description: Customer Identity, Role, Request Ownership, and Quote Award Hardening

-- 1. Add 'customer' value to partner_role enum if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'partner_role' AND e.enumlabel = 'customer'
    ) THEN
        ALTER TYPE public.partner_role ADD VALUE 'customer';
    END IF;
END $$;

-- 2. Add customer_id UUID column to public.requests
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requests_customer_id ON public.requests(customer_id);

-- 3. Update protect_partner_privileged_fields trigger function to support 'customer' role & status
CREATE OR REPLACE FUNCTION public.protect_partner_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_is_super_admin BOOLEAN := FALSE;
    v_is_relations_manager BOOLEAN := FALSE;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role::text INTO v_caller_role
    FROM public.partners
    WHERE id = v_caller_id;

    v_is_super_admin := (v_caller_role = 'super_admin');
    v_is_relations_manager := (v_caller_role = 'partner_relations_manager');

    -- Super admins bypass protection
    IF v_is_super_admin THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Allow standard external roles and customer
        IF NEW.role IS NOT NULL AND NEW.role::text NOT IN ('agency_partner', 'finishing_partner', 'developer_partner', 'customer') THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can assign administrative partner roles (attempted %).', NEW.role;
        END IF;

        IF NEW.type IS NOT NULL AND NEW.type IN (
            'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
            'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
            'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can create administrative account types.';
        END IF;

        IF NEW.custom_permissions IS NOT NULL AND array_length(NEW.custom_permissions, 1) > 0 THEN
            RAISE EXCEPTION 'Unauthorized: custom permissions can only be granted by a super admin.';
        END IF;

        IF NOT v_is_relations_manager THEN
            IF NEW.role::text = 'customer' THEN
                NEW.status := 'active'::partner_status;
            ELSIF NEW.status IS NOT NULL AND NEW.status::text IN ('active', 'approved') AND v_caller_id = NEW.id THEN
                NEW.status := 'pending'::partner_status;
            END IF;

            IF NEW.subscription_plan IS NOT NULL AND NEW.subscription_plan NOT IN ('basic', 'commission') THEN
                NEW.subscription_plan := 'basic';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner role (attempted % -> %).', OLD.role, NEW.role;
        END IF;

        IF NEW.custom_permissions IS DISTINCT FROM OLD.custom_permissions THEN
            RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify custom permissions.';
        END IF;

        IF NEW.type IS DISTINCT FROM OLD.type THEN
            IF NEW.type IN (
                'admin', 'decoration_manager', 'platform_finishing_manager', 'finishing_market_manager',
                'platform_real_estate_manager', 'real_estate_market_manager', 'partner_relations_manager',
                'content_manager', 'service_manager', 'customer_relations_manager', 'listings_manager'
            ) OR NOT v_is_relations_manager THEN
                RAISE EXCEPTION 'Unauthorized: only platform super_admin can modify partner account type.';
            END IF;
        END IF;

        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify partner status (attempted % -> %).', OLD.status, NEW.status;
            END IF;
        END IF;

        IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan) OR (NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date) THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify subscription plan or expiration date.';
            END IF;
        END IF;

        IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
            IF NOT (v_is_super_admin OR v_is_relations_manager) THEN
                RAISE EXCEPTION 'Unauthorized: only platform administrators can modify organization hierarchy.';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Trigger to bind authenticated customer identity to new requests
CREATE OR REPLACE FUNCTION public.set_request_customer_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- Assign authenticated user as customer_id
        IF NEW.customer_id IS NULL THEN
            NEW.customer_id := auth.uid();
        END IF;

        -- Bind authenticated email if missing
        IF NEW.requester_email IS NULL OR NEW.requester_email = '' THEN
            NEW.requester_email := auth.jwt()->>'email';
        END IF;

        -- Synchronize payload.requesterInfo
        IF NEW.payload IS NOT NULL THEN
            IF NEW.payload ? 'requesterInfo' THEN
                NEW.payload := jsonb_set(
                    NEW.payload,
                    '{requesterInfo,email}',
                    to_jsonb(COALESCE(NEW.requester_email, auth.jwt()->>'email', ''))
                );
                NEW.payload := jsonb_set(
                    NEW.payload,
                    '{requesterInfo,customerId}',
                    to_jsonb(COALESCE(NEW.customer_id::text, auth.uid()::text, ''))
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_request_customer_identity ON public.requests;
CREATE TRIGGER trigger_set_request_customer_identity
BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.set_request_customer_identity();

-- 5. Trigger to protect request ownership & assignment during UPDATE
CREATE OR REPLACE FUNCTION public.protect_request_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_staff BOOLEAN := FALSE;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = v_caller_id 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    ) INTO v_is_staff;

    IF v_is_staff THEN
        RETURN NEW;
    END IF;

    -- Non-staff cannot change customer_id
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id AND OLD.customer_id IS NOT NULL THEN
        NEW.customer_id := OLD.customer_id;
    END IF;

    -- Non-staff cannot reassign assigned_to directly via table update
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
        NEW.assigned_to := OLD.assigned_to;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_request_privileged_fields ON public.requests;
CREATE TRIGGER trigger_protect_request_privileged_fields
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.protect_request_privileged_fields();

-- 6. Update RLS policies on public.requests
DROP POLICY IF EXISTS "Customers view their own requests" ON public.requests;
CREATE POLICY "Customers view their own requests" ON public.requests FOR SELECT USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
);

DROP POLICY IF EXISTS "Customers update their own requests" ON public.requests;
CREATE POLICY "Customers update their own requests" ON public.requests FOR UPDATE USING (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
) WITH CHECK (
    (customer_id IS NOT NULL AND customer_id = auth.uid())
    OR requester_email = auth.jwt()->>'email'
    OR (payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
);

-- 7. Update RLS policy on public.finishing_quotes
DROP POLICY IF EXISTS "Customers view quotes for own requests" ON public.finishing_quotes;
CREATE POLICY "Customers view quotes for own requests" ON public.finishing_quotes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_quotes.request_id 
        AND (
            (requests.customer_id IS NOT NULL AND requests.customer_id = auth.uid())
            OR requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

-- 8. Update RLS policy on public.finishing_milestones
DROP POLICY IF EXISTS "Customers view milestones for own requests" ON public.finishing_milestones;
CREATE POLICY "Customers view milestones for own requests" ON public.finishing_milestones FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests 
        WHERE requests.id = finishing_milestones.request_id 
        AND (
            (requests.customer_id IS NOT NULL AND requests.customer_id = auth.uid())
            OR requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

-- 9. Update RLS policies on public.request_messages
DROP POLICY IF EXISTS "Customers view messages for own requests" ON public.request_messages;
CREATE POLICY "Customers view messages for own requests" ON public.request_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.type = 'message'
);

DROP POLICY IF EXISTS "Customers insert messages for own requests" ON public.request_messages;
CREATE POLICY "Customers insert messages for own requests" ON public.request_messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            (r.customer_id IS NOT NULL AND r.customer_id = auth.uid())
            OR r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.sender = 'client'
    AND request_messages.type = 'message'
);

-- 10. Update accept_finishing_quote RPC with fixed search_path and customer_id authorization
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
    -- Customer owner (by customer_id or email) OR Super Admin OR Platform Finishing Manager
    IF NOT (
        (v_request.customer_id IS NOT NULL AND v_request.customer_id = auth.uid()) OR
        (auth.jwt()->>'email' IS NOT NULL AND (
            v_request.requester_email = auth.jwt()->>'email' OR 
            (v_request.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )) OR
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
            jsonb_set(
                COALESCE(payload, '{}'::jsonb),
                '{winningQuote}',
                jsonb_build_object(
                    'quoteId', v_quote.id,
                    'partnerId', v_quote.partner_id,
                    'partnerName', v_quote.partner_name,
                    'totalPrice', v_quote.total_price,
                    'awardedAt', v_now,
                    'awardedBy', p_client_name
                )
            ),
            '{partnerId}',
            to_jsonb(v_quote.partner_id::text)
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
        (p_request_id, 3, 'أعمال المحارة، الجبس، والأسقف المعلقة', 'Plastering, Drywall & Suspended Ceilings', 'تأكيس وتربيع الحوائط، تنفيذ بؤج وأوتار المحارة، وتركيب جبسوم بورد للأسقف حسب المخطط المعتمد.', 20, 'pending', 0, 25, 'pending', v_now, v_now),
        (p_request_id, 4, 'تشطيب الأرضيات والحوائط وسيراميك الحمامات', 'Tiling, Flooring & Ceramic Finishing', 'توريد وتركيب البورسلين/السيراميك والأرضيات الخشبية وفق المناسيب الهندسية والفواصل المعتمدة.', 20, 'pending', 0, 20, 'pending', v_now, v_now),
        (p_request_id, 5, 'الدهانات النهائية، الإضاءة، والتسليم النهائي', 'Final Painting, Lighting & Project Handover', 'أوجه الدهان النهائية، تركيب المفاتيح والأفياش ووحدات الإنارة والأدوات الصحية والتسليم بمحضر رسمي.', 15, 'pending', 0, 15, 'pending', v_now, v_now);
    END IF;

    -- 8. Audit trail
    INSERT INTO public.finishing_request_history (
        request_id, action_type, changed_by, old_value, new_value, note, created_at
    ) VALUES (
        p_request_id,
        'quote_accepted',
        p_client_name,
        'submitted',
        'accepted',
        'تم اعتماد عرض المقاول ' || v_partner.name_ar || ' بقيمة ' || v_quote.total_price || ' ج.م وتعيين المقاول رسمياً وتفعيل مراحل التنفيذ.',
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'requestId', p_request_id,
        'quoteId', p_quote_id,
        'partnerId', v_quote.partner_id,
        'partnerName', v_partner.name_ar,
        'totalPrice', v_quote.total_price,
        'status', 'in-progress'
    );
END;
$$;
