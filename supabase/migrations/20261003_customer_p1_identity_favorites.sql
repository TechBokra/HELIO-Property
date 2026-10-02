-- Migration: 20261003_customer_p1_identity_favorites.sql
-- Description: Customer Journey P1 Final Hardening
-- 1. Notifications: FK to auth.users(id), updated send_system_notification RPC, hardened RLS
-- 2. Transactions: FK to auth.users(id), identity binding trigger, safe handling of legacy records
-- 3. Customer Favorites: Supabase-backed persistence table, composite uniqueness, and user-isolated RLS

-- ============================================================================
-- 1. NOTIFICATIONS USER IDENTITY (auth.users)
-- ============================================================================

-- Drop existing FK constraints on public.notifications(user_id) safely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.notifications'::regclass
          AND contype = 'f'
          AND (
              SELECT attname FROM pg_attribute
              WHERE attrelid = 'public.notifications'::regclass
                AND attnum = ANY(conkey)
          ) = 'user_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Preserve data: remove notifications referencing deleted/non-existent users before adding constraint
DELETE FROM public.notifications 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = notifications.user_id);

-- Add new FK referencing auth.users(id) directly
ALTER TABLE public.notifications
ADD CONSTRAINT fk_notifications_user_auth
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- Hardened RPC: send_system_notification
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
    -- 1. Ensure target user exists in auth.users
    SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_target_exists;
    IF NOT v_target_exists THEN
        RAISE EXCEPTION 'Target recipient user does not exist in auth.users: %', p_user_id;
    END IF;

    -- 2. Ensure message is a valid JSON object with language keys
    IF p_message IS NULL OR jsonb_typeof(p_message) <> 'object' THEN
        RAISE EXCEPTION 'Invalid notification message format. Expected JSON object with {ar, en}.';
    END IF;

    -- 3. Validate caller authorization
    IF v_caller_id IS NOT NULL THEN
        SELECT (role = 'super_admin'), (role LIKE '%_manager')
        INTO v_is_super_admin, v_is_manager
        FROM public.partners 
        WHERE id = v_caller_id;

        IF NOT (
            v_caller_id = p_user_id 
            OR COALESCE(v_is_super_admin, FALSE) 
            OR COALESCE(v_is_manager, FALSE)
            -- Target is super_admin or manager
            OR EXISTS (SELECT 1 FROM public.partners WHERE id = p_user_id AND (role = 'super_admin' OR role LIKE '%_manager'))
            -- Connected via a request (as customer, assigned partner, or manager)
            OR EXISTS (
                SELECT 1 FROM public.requests r 
                WHERE (r.customer_id = v_caller_id OR r.assigned_to = v_caller_id OR (r.payload->>'partnerId')::uuid = v_caller_id)
                AND (r.customer_id = p_user_id OR r.assigned_to = p_user_id OR (r.payload->>'managerId')::uuid = p_user_id)
            )
        ) THEN
            RAISE EXCEPTION 'Not authorized to send notification to user %', p_user_id;
        END IF;
    ELSE
        -- Anonymous caller: only allowed to notify platform managers or administrators
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

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert self notifications or managers insert any" ON public.notifications;
DROP POLICY IF EXISTS "Users insert self notifications" ON public.notifications;
CREATE POLICY "Users insert self notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role LIKE '%_manager')
    )
);


-- ============================================================================
-- 2. TRANSACTIONS USER IDENTITY (auth.users)
-- ============================================================================

-- Drop existing FK constraints on public.transactions(user_id) safely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.transactions'::regclass
          AND contype = 'f'
          AND (
              SELECT attname FROM pg_attribute
              WHERE attrelid = 'public.transactions'::regclass
                AND attnum = ANY(conkey)
          ) = 'user_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.transactions DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Preserve historical records: set user_id = NULL for any legacy record where user_id is not in auth.users
UPDATE public.transactions 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = transactions.user_id);

-- Add new FK referencing auth.users(id) ON DELETE SET NULL
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_user_auth
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);

-- Trigger to bind authenticated identity and protect privileged transaction fields
CREATE OR REPLACE FUNCTION public.set_transaction_customer_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- If caller is authenticated, authoritative user_id is auth.uid()
    IF auth.uid() IS NOT NULL THEN
        NEW.user_id := auth.uid();
    END IF;

    -- Ensure non-admins cannot insert transaction with status 'paid' unless verified
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'service_manager' OR role = 'partner_relations_manager')
    ) THEN
        -- Default to 'reviewing' unless method is 'card' (simulated gateway)
        IF NEW.method <> 'card' THEN
            NEW.status := 'reviewing';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_transaction_customer_identity ON public.transactions;
CREATE TRIGGER trigger_set_transaction_customer_identity
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_customer_identity();

-- Transactions RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners view own transactions or admins view all" ON public.transactions;
DROP POLICY IF EXISTS "Users view own transactions or admins view all" ON public.transactions;
CREATE POLICY "Users view own transactions or admins view all" ON public.transactions FOR SELECT USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager')
    )
);

DROP POLICY IF EXISTS "Users insert own transactions or admins insert any" ON public.transactions;
CREATE POLICY "Users insert own transactions or admins insert any" ON public.transactions FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    OR user_id IS NULL 
    OR EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager')
    )
);

DROP POLICY IF EXISTS "Admins manage transactions" ON public.transactions;
CREATE POLICY "Admins manage transactions" ON public.transactions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND (p.role = 'super_admin' OR p.role = 'service_manager' OR p.role = 'partner_relations_manager')
    )
);

DROP POLICY IF EXISTS "Super admins delete transactions" ON public.transactions;
CREATE POLICY "Super admins delete transactions" ON public.transactions FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = auth.uid() 
        AND p.role = 'super_admin'
    )
);


-- ============================================================================
-- 3. CUSTOMER FAVORITES (public.customer_favorites)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL DEFAULT 'property',
    entity_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_customer_favorites UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_favorites_user ON public.customer_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_user_prop ON public.customer_favorites(user_id, property_id);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own favorites" ON public.customer_favorites;
CREATE POLICY "Customers view own favorites" ON public.customer_favorites FOR SELECT USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Customers insert own favorites" ON public.customer_favorites;
CREATE POLICY "Customers insert own favorites" ON public.customer_favorites FOR INSERT WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Customers delete own favorites" ON public.customer_favorites;
CREATE POLICY "Customers delete own favorites" ON public.customer_favorites FOR DELETE USING (
    user_id = auth.uid()
);
