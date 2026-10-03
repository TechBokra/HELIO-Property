-- Migration: 20261006_execution_p1_hardening.sql
-- Description: Execution P1 Hardening:
-- 1. Stage 5 Handover Lifecycle: Auto-transition request to 'completed' with audit history and notifications
-- 2. Material Milestone Notifications: In-app notifications for customer and manager on milestone changes
-- 3. Public vs Internal Execution Notes: Separate internal_notes from customer_notes on finishing_milestones
-- 4. Execution Attachments: Table public.execution_attachments with strict RLS for milestone evidence/docs

-- ============================================================================
-- 1. Public vs Internal Execution Notes (P1.4)
-- ============================================================================

ALTER TABLE public.finishing_milestones 
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Backfill legacy inspector_notes safely
UPDATE public.finishing_milestones
SET customer_notes = inspector_notes
WHERE customer_notes IS NULL AND inspector_notes IS NOT NULL;

UPDATE public.finishing_milestones
SET internal_notes = inspector_notes
WHERE internal_notes IS NULL AND inspector_notes IS NOT NULL;

-- Create secure view for customer milestone queries that strictly excludes internal_notes
CREATE OR REPLACE VIEW public.customer_milestones_view
WITH (security_invoker = true)
AS
SELECT 
    id,
    request_id,
    stage_number,
    title_ar,
    title_en,
    description_ar,
    description_en,
    target_days,
    status,
    progress_percentage,
    payment_percentage,
    payment_status,
    customer_notes,
    completed_at,
    created_at,
    updated_at
FROM public.finishing_milestones;

-- ============================================================================
-- 2. Stage 5 Handover Lifecycle & Auto-Completion (P1.2)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_finishing_stage5_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_request RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Reversal Guard: Completed Stage 5 handover is final and cannot be reverted backwards
    IF OLD.stage_number = 5 AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        RAISE EXCEPTION 'Invalid operation: Completed Stage 5 handover is final and cannot be reverted backwards.';
    END IF;

    -- Only act when Stage 5 reaches verified completion (status = 'completed' AND progress_percentage = 100)
    IF NEW.stage_number = 5 AND NEW.status = 'completed' AND NEW.progress_percentage = 100 THEN
        SELECT * INTO v_request
        FROM public.requests
        WHERE id = NEW.request_id;

        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        -- Idempotent transition: only update if not already completed or closed
        IF v_request.status IS DISTINCT FROM 'completed' AND v_request.status IS DISTINCT FROM 'closed' THEN
            -- 1. Atomically update parent request status
            UPDATE public.requests
            SET status = 'completed',
                updated_at = v_now
            WHERE id = NEW.request_id;

            -- 2. Record audit trail in finishing_request_history
            INSERT INTO public.finishing_request_history (
                request_id,
                action_type,
                changed_by,
                old_value,
                new_value,
                note,
                created_at
            ) VALUES (
                NEW.request_id,
                'project_completed',
                'System Handover Engine',
                v_request.status,
                'completed',
                'تم اكتمال المرحلة النهائية (المراجعة الفنية والتسليم النهائي) بنجاح واكتمال المشروع رسمياً.',
                v_now
            );

            -- 3. Emit completion in-app notification to customer
            IF v_request.customer_id IS NOT NULL THEN
                INSERT INTO public.notifications (
                    user_id,
                    message,
                    link,
                    is_read,
                    created_at
                ) VALUES (
                    v_request.customer_id,
                    jsonb_build_object(
                        'ar', 'تهانينا! تم اكتمال وتسليم مشروع التشطيب بنجاح بنسبة 100%. شكراً لثقتك في Only Helio.',
                        'en', 'Congratulations! Your finishing project has been successfully completed and handed over (100%).'
                    ),
                    '/my-dashboard/requests',
                    false,
                    v_now
                );
            END IF;

            -- 4. Emit completion in-app notification to assigned contractor
            IF v_request.assigned_to IS NOT NULL THEN
                INSERT INTO public.notifications (
                    user_id,
                    message,
                    link,
                    is_read,
                    created_at
                ) VALUES (
                    v_request.assigned_to,
                    jsonb_build_object(
                        'ar', 'تم إنجاز وتسليم المرحلة النهائية لمشروع التشطيب بنجاح واكتمال الطلب رسمياً.',
                        'en', 'Final milestone completed and handed over successfully. Request is now officially marked completed.'
                    ),
                    '/dashboard/leads/' || NEW.request_id,
                    false,
                    v_now
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_handle_finishing_stage5_completion ON public.finishing_milestones;
CREATE TRIGGER trigger_handle_finishing_stage5_completion
AFTER UPDATE ON public.finishing_milestones
FOR EACH ROW EXECUTE FUNCTION public.handle_finishing_stage5_completion();

-- ============================================================================
-- 3. Milestone Progress In-App Notifications (P1.3)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_finishing_milestone_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_request RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_msg_ar TEXT;
    v_msg_en TEXT;
    v_partner_record RECORD;
BEGIN
    -- Skip if it's the final stage 5 completion (already notified in handle_finishing_stage5_completion)
    IF NEW.stage_number = 5 AND NEW.status = 'completed' AND NEW.progress_percentage = 100 THEN
        RETURN NEW;
    END IF;

    -- Only trigger on meaningful state changes: status change or material progress change (>= 20%)
    IF (OLD.status IS NOT DISTINCT FROM NEW.status) 
       AND (OLD.progress_percentage IS NOT DISTINCT FROM NEW.progress_percentage 
            OR abs(COALESCE(NEW.progress_percentage, 0) - COALESCE(OLD.progress_percentage, 0)) < 20) THEN
        RETURN NEW;
    END IF;

    -- Fetch request context
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = NEW.request_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Compose messages
    IF NEW.status = 'completed' THEN
        v_msg_ar := 'تم اكتمال واعتماد مرحلة: "' || NEW.title_ar || '" بنجاح بنسبة 100%.';
        v_msg_en := 'Milestone completed and verified: "' || NEW.title_en || '" (100%).';
    ELSIF NEW.status = 'delayed' THEN
        v_msg_ar := 'تنبيه: مرحلة "' || NEW.title_ar || '" متأخرة عن الجدول الزمني المخطط.';
        v_msg_en := 'Alert: Milestone delayed: "' || NEW.title_en || '".';
    ELSIF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
        v_msg_ar := 'بدء العمل في مرحلة: "' || NEW.title_ar || '".';
        v_msg_en := 'Work commenced on milestone: "' || NEW.title_en || '".';
    ELSE
        v_msg_ar := 'تحديث إنجاز مرحلة "' || NEW.title_ar || '": وصل الإنجاز إلى ' || NEW.progress_percentage || '%.';
        v_msg_en := 'Progress updated for milestone "' || NEW.title_en || '": reached ' || NEW.progress_percentage || '%.';
    END IF;

    -- Isolated notification insertion to protect core milestone transaction
    BEGIN
        -- 1. Notify Customer
        IF v_request.customer_id IS NOT NULL THEN
            -- Check for duplicate notifications in the last 15 seconds
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = v_request.customer_id 
                  AND link = '/my-dashboard/requests' 
                  AND created_at > (v_now - INTERVAL '15 seconds')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    message,
                    link,
                    is_read,
                    created_at
                ) VALUES (
                    v_request.customer_id,
                    jsonb_build_object('ar', v_msg_ar, 'en', v_msg_en),
                    '/my-dashboard/requests',
                    false,
                    v_now
                );
            END IF;
        END IF;

        -- 2. Notify Platform Finishing Managers
        FOR v_partner_record IN (
            SELECT id FROM public.partners 
            WHERE status = 'active' 
              AND role IN ('super_admin', 'platform_finishing_manager')
        ) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = v_partner_record.id 
                  AND link = '/admin/platform-finishing/requests' 
                  AND created_at > (v_now - INTERVAL '15 seconds')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    message,
                    link,
                    is_read,
                    created_at
                ) VALUES (
                    v_partner_record.id,
                    jsonb_build_object(
                        'ar', 'تحديث تنفيذي: ' || v_msg_ar,
                        'en', 'Execution update: ' || v_msg_en
                    ),
                    '/admin/platform-finishing/requests',
                    false,
                    v_now
                );
            END IF;
        END LOOP;
    EXCEPTION
        WHEN OTHERS THEN
            -- Notification failure must not roll back milestone update
            NULL;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_finishing_milestone_update ON public.finishing_milestones;
CREATE TRIGGER trigger_notify_finishing_milestone_update
AFTER UPDATE ON public.finishing_milestones
FOR EACH ROW EXECUTE FUNCTION public.notify_finishing_milestone_update();

-- ============================================================================
-- 4. Secure Execution Attachments (P1.5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.execution_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    milestone_id UUID REFERENCES public.finishing_milestones(id) ON DELETE SET NULL,
    uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT DEFAULT 'photo', -- 'photo', 'document', 'inspection_evidence', 'handover_evidence'
    category TEXT DEFAULT 'milestone_evidence', -- 'milestone_evidence', 'inspection_evidence', 'handover_evidence', 'blueprint'
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_attachments_request ON public.execution_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_execution_attachments_milestone ON public.execution_attachments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_execution_attachments_uploader ON public.execution_attachments(uploader_id);

ALTER TABLE public.execution_attachments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Customers view non-internal attachments for own requests
DROP POLICY IF EXISTS "Customers view own execution attachments" ON public.execution_attachments;
CREATE POLICY "Customers view own execution attachments" ON public.execution_attachments
FOR SELECT USING (
    is_internal = FALSE
    AND EXISTS (
        SELECT 1 FROM public.requests
        WHERE requests.id = execution_attachments.request_id
        AND (
            (requests.customer_id IS NOT NULL AND requests.customer_id = auth.uid())
            OR requests.requester_email = auth.jwt()->>'email'
            OR (requests.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

-- Policy 2: Assigned active partners view all attachments for assigned requests
DROP POLICY IF EXISTS "Assigned active partners view attachments" ON public.execution_attachments;
CREATE POLICY "Assigned active partners view attachments" ON public.execution_attachments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.requests
        WHERE requests.id = execution_attachments.request_id
        AND (requests.assigned_to = auth.uid() OR (requests.payload->>'partnerId')::uuid = auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
);

-- Policy 3: Assigned active partners insert attachments for assigned requests
DROP POLICY IF EXISTS "Assigned active partners insert attachments" ON public.execution_attachments;
CREATE POLICY "Assigned active partners insert attachments" ON public.execution_attachments
FOR INSERT TO authenticated WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.requests
        WHERE requests.id = execution_attachments.request_id
        AND (requests.assigned_to = auth.uid() OR (requests.payload->>'partnerId')::uuid = auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
);

-- Policy 4: Platform administrators and finishing managers manage all execution attachments
DROP POLICY IF EXISTS "Admins manage all execution attachments" ON public.execution_attachments;
CREATE POLICY "Admins manage all execution attachments" ON public.execution_attachments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND (p.role = 'super_admin' OR p.role = 'platform_finishing_manager' OR p.role = 'finishing_market_manager')
    )
);

-- Policy 5: Uploaders can delete their own attachments if partner is active
DROP POLICY IF EXISTS "Uploaders delete own attachments" ON public.execution_attachments;
CREATE POLICY "Uploaders delete own attachments" ON public.execution_attachments
FOR DELETE TO authenticated USING (
    uploader_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = auth.uid()
        AND p.status = 'active'
    )
);
