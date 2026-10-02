-- Migration: 20261004_customer_journey_p1_hardening.sql
-- Description: Customer Journey P1 Hardening: Notifications & Transactions FK generalization to auth.users, Customer Favorites table with RLS, and Quote Award In-App Notifications

-- 1. Generalize notifications foreign key constraint to link directly to auth.users(id)
DO $$
BEGIN
    -- Drop old foreign key constraint pointing to partners if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
    END IF;

    -- Add updated foreign key pointing to auth.users
    ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        -- If any orphan user_id exists in test data, handle gracefully
        RAISE NOTICE 'Notifications FK constraint update note: %', SQLERRM;
END $$;

-- Ensure indexes on notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 2. Generalize transactions foreign key constraint to link directly to auth.users(id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_user_id_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_user_id_fkey;
    END IF;

    ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Transactions FK constraint update note: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- 3. Customer Favorites table with RLS & unique constraint
CREATE TABLE IF NOT EXISTS public.customer_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'property', -- 'property', 'service', 'portfolio'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_favorite_item UNIQUE(user_id, item_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_customer_favorites_user_id ON public.customer_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_item ON public.customer_favorites(item_id, item_type);

-- Enable RLS on customer_favorites
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own favorites" ON public.customer_favorites;
CREATE POLICY "Users view own favorites" ON public.customer_favorites 
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own favorites" ON public.customer_favorites;
CREATE POLICY "Users insert own favorites" ON public.customer_favorites 
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own favorites" ON public.customer_favorites;
CREATE POLICY "Users delete own favorites" ON public.customer_favorites 
FOR DELETE USING (user_id = auth.uid());

-- 4. Update accept_finishing_quote RPC to emit real-time system notifications for contractor & customer
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

    -- 9. P1: Emit in-app notifications to contractor partner and customer
    -- Contractor notification
    BEGIN
        INSERT INTO public.notifications (
            user_id, 
            message, 
            link, 
            is_read, 
            created_at
        ) VALUES (
            v_quote.partner_id,
            jsonb_build_object(
                'ar', 'تهانينا! تم اعتماد عرضك لمشروع التشطيب وتعيينك مقاولاً للمشروع بقيمة ' || v_quote.total_price || ' ج.م.',
                'en', 'Congratulations! Your quote for the finishing project was awarded for ' || v_quote.total_price || ' EGP.'
            ),
            '/dashboard/leads',
            false,
            v_now
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Notification to contractor skipped: %', SQLERRM;
    END;

    -- Customer notification
    IF v_request.customer_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.notifications (
                user_id, 
                message, 
                link, 
                is_read, 
                created_at
            ) VALUES (
                v_request.customer_id,
                jsonb_build_object(
                    'ar', 'تم اعتماد عرض شركة ' || COALESCE(v_partner.name_ar, 'المقاول') || ' بنجاح وبدء مراحل تنفيذ المشروع.',
                    'en', 'Contractor quote by ' || COALESCE(v_partner.name_en, 'Contractor') || ' was successfully awarded and milestones are active.'
                ),
                '/my-dashboard/requests',
                false,
                v_now
            );
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Notification to customer skipped: %', SQLERRM;
        END;
    END IF;

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
