-- =========================================================================
-- MIGRATION: 20260930_leads_requests_hardening.sql
-- PURPOSE: P0/P1 Production Hardening for Leads & Requests Domain
--          - P0.1: Secure request_messages with RLS
--          - P0.2: Add partner UPDATE RLS policy on public.requests
--          - P0.3: Grant platform managers domain-scoped access on requests
--          - P0.4: Database view for masked partner leads (PII protection)
--          - P1.1: Database-backed public.request_history & audit trigger
--          - Secure notifications table with RLS
--          - Add missing database indexes on requests
-- =========================================================================

-- 1. SECURE REQUEST MESSAGES (P0.1)
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view messages for own requests" ON public.request_messages;
CREATE POLICY "Customers view messages for own requests" 
ON public.request_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.type = 'message'
);

DROP POLICY IF EXISTS "Customers insert messages for own requests" ON public.request_messages;
CREATE POLICY "Customers insert messages for own requests" 
ON public.request_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
    AND request_messages.sender = 'client'
    AND request_messages.type = 'message'
);

DROP POLICY IF EXISTS "Assigned partners view messages for assigned requests" ON public.request_messages;
CREATE POLICY "Assigned partners view messages for assigned requests" 
ON public.request_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Assigned partners insert messages for assigned requests" ON public.request_messages;
CREATE POLICY "Assigned partners insert messages for assigned requests" 
ON public.request_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_messages.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid()
        )
    )
    AND request_messages.sender = 'partner'
);

DROP POLICY IF EXISTS "Admins and managers view and insert all request messages" ON public.request_messages;
CREATE POLICY "Admins and managers view and insert all request messages" 
ON public.request_messages FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role IN (
                'super_admin', 'platform_finishing_manager', 'finishing_market_manager',
                'decoration_manager', 'listings_manager', 'platform_real_estate_manager',
                'real_estate_market_manager', 'partner_relations_manager',
                'customer_relations_manager', 'service_manager'
            )
        )
    )
);

-- 2. HARDEN REQUESTS POLICIES (P0.2 & P0.3)
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned partners can view their requests" ON public.requests;
CREATE POLICY "Assigned partners can view their requests" 
ON public.requests FOR SELECT 
USING (
    auth.uid() = assigned_to 
    OR (payload->>'partnerId')::uuid = auth.uid()
);

DROP POLICY IF EXISTS "Assigned partners can update their requests" ON public.requests;
CREATE POLICY "Assigned partners can update their requests" 
ON public.requests FOR UPDATE 
USING (
    auth.uid() = assigned_to 
    OR (payload->>'partnerId')::uuid = auth.uid()
)
WITH CHECK (
    auth.uid() = assigned_to 
    OR (payload->>'partnerId')::uuid = auth.uid()
);

DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Admins and managers manage requests" ON public.requests;
CREATE POLICY "Admins and managers manage requests" 
ON public.requests FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin'
            OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND (
                requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                    OR requests.payload->>'category' = 'turnkey'
                    OR requests.payload->>'serviceTitle' ILIKE '%تشطيب%'
                    OR requests.payload->>'serviceTitle' ILIKE '%finishing%'
                )
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role = 'decoration_manager' AND (
                requests.type = 'LEAD' AND (
                    requests.payload->>'serviceType' IN ('decorations', 'decoration')
                    OR requests.payload->>'serviceTitle' ILIKE '%ديكور%'
                    OR requests.payload->>'serviceTitle' ILIKE '%decor%'
                )
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND (
                requests.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                OR (requests.type = 'LEAD' AND (requests.payload->>'serviceType' = 'property' OR requests.payload->>'propertyId' IS NOT NULL))
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role = 'partner_relations_manager' AND (
                requests.type = 'PARTNER_APPLICATION'
                OR requests.assigned_to = auth.uid()
            ))
            OR (p.role IN ('customer_relations_manager', 'service_manager') AND (
                requests.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                OR requests.assigned_to = auth.uid()
            ))
        )
    )
);

-- 3. SECURE NOTIFICATIONS TABLE
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users create notifications" ON public.notifications;
CREATE POLICY "Authenticated users create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 4. DATABASE INDEXES ON REQUESTS & MESSAGES
CREATE INDEX IF NOT EXISTS idx_requests_type ON public.requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_requester_email ON public.requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_requests_type_created ON public.requests(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_messages_req ON public.request_messages(request_id);

-- 5. DATABASE VIEW FOR MASKED PARTNER LEADS (P0.4 PII PROTECTION)
CREATE OR REPLACE VIEW public.partner_leads_view AS
SELECT 
    r.id,
    r.type,
    r.status,
    CASE 
        WHEN r.assigned_to = auth.uid() 
             OR (r.payload->>'partnerId')::uuid = auth.uid() 
             OR EXISTS (
                 SELECT 1 FROM public.finishing_quotes fq 
                 WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
             ) 
             OR EXISTS (
                 SELECT 1 FROM public.partners p 
                 WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
             )
        THEN r.requester_name
        ELSE 'عميل المنصة (مناقصة)'
    END AS requester_name,
    CASE 
        WHEN r.assigned_to = auth.uid() 
             OR (r.payload->>'partnerId')::uuid = auth.uid() 
             OR EXISTS (
                 SELECT 1 FROM public.finishing_quotes fq 
                 WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
             ) 
             OR EXISTS (
                 SELECT 1 FROM public.partners p 
                 WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
             )
        THEN r.requester_phone
        ELSE NULL
    END AS requester_phone,
    CASE 
        WHEN r.assigned_to = auth.uid() 
             OR (r.payload->>'partnerId')::uuid = auth.uid() 
             OR EXISTS (
                 SELECT 1 FROM public.finishing_quotes fq 
                 WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
             ) 
             OR EXISTS (
                 SELECT 1 FROM public.partners p 
                 WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
             )
        THEN r.requester_email
        ELSE NULL
    END AS requester_email,
    r.assigned_to,
    CASE 
        WHEN r.assigned_to = auth.uid() 
             OR (r.payload->>'partnerId')::uuid = auth.uid() 
             OR EXISTS (
                 SELECT 1 FROM public.finishing_quotes fq 
                 WHERE fq.request_id = r.id AND fq.partner_id = auth.uid() AND fq.status = 'accepted'
             ) 
             OR EXISTS (
                 SELECT 1 FROM public.partners p 
                 WHERE p.id = auth.uid() AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
             )
        THEN r.payload
        ELSE (r.payload - 'customerPhone' - 'customerName')
    END AS payload,
    r.created_at,
    r.updated_at
FROM public.requests r;

-- 6. GENERAL REQUEST HISTORY / AUDIT TRAIL (P1.1)
CREATE TABLE IF NOT EXISTS public.request_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL DEFAULT 'System',
    actor_role TEXT,
    action TEXT NOT NULL, -- 'created', 'status_changed', 'reassigned', 'note_added', 'cancelled'
    old_status TEXT,
    new_status TEXT,
    old_assigned_to UUID,
    new_assigned_to UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_history_req ON public.request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_request_history_created ON public.request_history(created_at DESC);

ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and managers view all request history" ON public.request_history;
CREATE POLICY "Admins and managers view all request history" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
);

DROP POLICY IF EXISTS "Assigned partners view history of assigned requests" ON public.request_history;
CREATE POLICY "Assigned partners view history of assigned requests" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (r.assigned_to = auth.uid() OR (r.payload->>'partnerId')::uuid = auth.uid())
    )
);

DROP POLICY IF EXISTS "Customers view history of own requests" ON public.request_history;
CREATE POLICY "Customers view history of own requests" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (
            r.requester_email = auth.jwt()->>'email'
            OR (r.payload->'requesterInfo'->>'email') = auth.jwt()->>'email'
        )
    )
);

DROP POLICY IF EXISTS "Authenticated users insert request history" ON public.request_history;
CREATE POLICY "Authenticated users insert request history" 
ON public.request_history FOR INSERT WITH CHECK (true);

-- 7. TRIGGER: LOG REQUEST MUTATIONS IN AUDIT TRAIL (P1.1)
CREATE OR REPLACE FUNCTION trg_log_request_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT := 'System';
    v_actor_role TEXT := 'system';
BEGIN
    IF v_actor_id IS NOT NULL THEN
        SELECT name_en, role INTO v_actor_name, v_actor_role FROM public.partners WHERE id = v_actor_id;
        IF v_actor_name IS NULL THEN
            v_actor_name := COALESCE(auth.jwt()->>'email', 'Authenticated User');
        END IF;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.request_history (
            request_id, actor_id, actor_name, actor_role, action,
            new_status, new_assigned_to, metadata, note, created_at
        ) VALUES (
            NEW.id, v_actor_id, v_actor_name, v_actor_role, 'created',
            NEW.status, NEW.assigned_to, jsonb_build_object('type', NEW.type),
            'تم إنشاء الطلب في النظام', NOW()
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
            INSERT INTO public.request_history (
                request_id, actor_id, actor_name, actor_role,
                action, old_status, new_status, old_assigned_to, new_assigned_to,
                metadata, note, created_at
            ) VALUES (
                NEW.id, v_actor_id, v_actor_name, v_actor_role,
                CASE 
                    WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'reassigned'
                    ELSE 'status_changed'
                END,
                OLD.status, NEW.status, OLD.assigned_to, NEW.assigned_to,
                jsonb_build_object('type', NEW.type),
                CASE 
                    WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'تمت إعادة تعيين مسؤول الطلب'
                    ELSE 'تحديث حالة الطلب إلى: ' || NEW.status
                END,
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_request_mutation_trigger ON public.requests;
CREATE TRIGGER log_request_mutation_trigger
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW EXECUTE PROCEDURE trg_log_request_mutation();
