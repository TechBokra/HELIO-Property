-- =========================================================================
-- MIGRATION: 20260930_request_history_audit_security.sql
-- PURPOSE: Fix Request History Audit Trail Security
--          1. Drop insecure INSERT policy allowing direct user tampering ("Authenticated users insert request history")
--          2. Ensure NO direct INSERT/UPDATE/DELETE policies exist for public/authenticated roles
--          3. Re-harden trg_log_request_mutation() as SECURITY DEFINER with fixed search_path = public, pg_temp
--          4. Restrict SELECT policies so platform managers can only read history within their authorized domain scope
--          5. Preserve customer and assigned partner scoped read access
-- =========================================================================

-- 1. DROP INSECURE DIRECT INSERT POLICIES
DROP POLICY IF EXISTS "Authenticated users insert request history" ON public.request_history;
DROP POLICY IF EXISTS "Users insert request history" ON public.request_history;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.request_history;

-- 2. ENSURE RLS IS ENABLED
ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

-- 3. ENSURE NO DIRECT UPDATE OR DELETE POLICIES EXIST (IMMUTABLE AUDIT LOG)
DROP POLICY IF EXISTS "Authenticated users update request history" ON public.request_history;
DROP POLICY IF EXISTS "Authenticated users delete request history" ON public.request_history;

-- 4. RECREATE DOMAIN-SCOPED READ POLICIES

-- Super Admins & Domain-Scoped Platform Managers
DROP POLICY IF EXISTS "Admins and managers view all request history" ON public.request_history;
DROP POLICY IF EXISTS "Admins and managers view scoped request history" ON public.request_history;

CREATE POLICY "Admins and managers view scoped request history" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (
            p.role = 'super_admin'
            OR (p.role IN ('platform_finishing_manager', 'finishing_market_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    (r.type = 'LEAD' AND (
                        r.payload->>'serviceType' IN ('finishing', 'renovation', 'turnkey')
                        OR r.payload->>'category' = 'turnkey'
                        OR r.payload->>'serviceTitle' ILIKE '%تشطيب%'
                        OR r.payload->>'serviceTitle' ILIKE '%finishing%'
                    ))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role = 'decoration_manager' AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    (r.type = 'LEAD' AND (
                        r.payload->>'serviceType' IN ('decorations', 'decoration')
                        OR r.payload->>'serviceTitle' ILIKE '%ديكور%'
                        OR r.payload->>'serviceTitle' ILIKE '%decor%'
                    ))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role IN ('listings_manager', 'platform_real_estate_manager', 'real_estate_market_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type IN ('PROPERTY_LISTING_REQUEST', 'PROPERTY_INQUIRY')
                    OR (r.type = 'LEAD' AND (r.payload->>'serviceType' = 'property' OR r.payload->>'propertyId' IS NOT NULL))
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role = 'partner_relations_manager' AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type = 'PARTNER_APPLICATION'
                    OR r.assigned_to = auth.uid()
                )
            ))
            OR (p.role IN ('customer_relations_manager', 'service_manager') AND EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE r.id = request_history.request_id 
                AND (
                    r.type IN ('CONTACT_MESSAGE', 'PROPERTY_INQUIRY')
                    OR r.assigned_to = auth.uid()
                )
            ))
        )
    )
);

-- Assigned Partners: Only for requests assigned to them
DROP POLICY IF EXISTS "Assigned partners view history of assigned requests" ON public.request_history;
CREATE POLICY "Assigned partners view history of assigned requests" 
ON public.request_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (
            r.assigned_to = auth.uid() 
            OR (r.payload->>'partnerId')::uuid = auth.uid()
        )
    )
);

-- Customers: Only for their own requests
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

-- 5. HARDEN THE TRIGGER FUNCTION (SECURITY DEFINER + FIXED SEARCH_PATH)
CREATE OR REPLACE FUNCTION public.trg_log_request_mutation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
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
$$;

-- 6. RE-ATTACH TRIGGER (IDEMPOTENT)
DROP TRIGGER IF EXISTS log_request_mutation_trigger ON public.requests;
CREATE TRIGGER log_request_mutation_trigger
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW EXECUTE PROCEDURE public.trg_log_request_mutation();
