-- =====================================================================
-- Test-data registry: every piece of trial/demo data is recorded here so
-- the whole site can be cleaned in one step before going live.
--
--   * test_data_registry      : (table, row id, group) of every test row/account
--   * app_runtime_flags        : 'test_mode' — while ON, every new account and
--                                every new operational/content row is registered
--                                automatically. Rows owned by (or attached to) a
--                                registered row are registered even when OFF.
--   * test_data_summary()      : counts per group/table (admin page + SQL)
--   * purge_test_data()        : deletes everything registered (super_admin only)
--   * mark/unmark_test_data()  : manual corrections from the admin page
--   * set_test_mode()          : switch automatic tagging on/off
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.test_data_registry (
    table_name    text        NOT NULL,
    row_id        text        NOT NULL,
    group_name    text        NOT NULL DEFAULT 'content'
                  CHECK (group_name IN ('test_accounts', 'demo_staff_accounts', 'content', 'operations')),
    label         text,
    registered_at timestamptz NOT NULL DEFAULT now(),
    registered_by uuid        DEFAULT auth.uid(),
    PRIMARY KEY (table_name, row_id)
);
CREATE INDEX IF NOT EXISTS idx_test_data_registry_group ON public.test_data_registry (group_name);

CREATE TABLE IF NOT EXISTS public.test_data_purge_log (
    id         bigserial PRIMARY KEY,
    purged_at  timestamptz NOT NULL DEFAULT now(),
    purged_by  uuid,
    groups     text[],
    result     jsonb
);

CREATE TABLE IF NOT EXISTS public.app_runtime_flags (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);
INSERT INTO public.app_runtime_flags (key, value) VALUES ('test_mode', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.test_data_registry  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_data_purge_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_runtime_flags   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read test registry" ON public.test_data_registry;
CREATE POLICY "Super admins read test registry" ON public.test_data_registry
    FOR SELECT TO authenticated USING (public.current_partner_role() = 'super_admin');
DROP POLICY IF EXISTS "Super admins read purge log" ON public.test_data_purge_log;
CREATE POLICY "Super admins read purge log" ON public.test_data_purge_log
    FOR SELECT TO authenticated USING (public.current_partner_role() = 'super_admin');
DROP POLICY IF EXISTS "Anyone reads runtime flags" ON public.app_runtime_flags;
CREATE POLICY "Anyone reads runtime flags" ON public.app_runtime_flags
    FOR SELECT USING (true);
-- Writes happen only through the SECURITY DEFINER functions below.
REVOKE INSERT, UPDATE, DELETE ON public.test_data_registry, public.test_data_purge_log, public.app_runtime_flags FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_test_mode()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE((SELECT value = 'true'::jsonb FROM public.app_runtime_flags WHERE key = 'test_mode'), false);
$$;

CREATE OR REPLACE FUNCTION public.test_data_group_for(p_table text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN p_table = 'auth.users' THEN 'test_accounts'
        WHEN p_table IN ('properties', 'projects', 'portfolio_items', 'partner_finishing_services', 'partner_capabilities') THEN 'content'
        ELSE 'operations'
    END;
$$;

CREATE OR REPLACE FUNCTION public.assert_test_data_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- auth.uid() IS NULL: SQL editor / migrations / service role.
    IF auth.uid() IS NOT NULL AND COALESCE(public.current_partner_role(), '') <> 'super_admin' THEN
        RAISE EXCEPTION 'Only a super admin can manage test data.' USING ERRCODE = '42501';
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- Automatic tagging.
-- Trigger args: pairs "column:target" where target is 'account' (auth user id)
-- or a tracked table name. A new row is registered when test mode is ON, or
-- when any referenced account/row is already registered.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_register_test_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_new   jsonb := to_jsonb(NEW);
    v_id    text  := v_new ->> 'id';
    v_pair  text;
    v_col   text;
    v_tgt   text;
    v_ref   text;
    v_hit   boolean := public.is_test_mode();
BEGIN
    IF v_id IS NULL THEN RETURN NEW; END IF;
    IF NOT v_hit THEN
        FOREACH v_pair IN ARRAY TG_ARGV LOOP
            v_col := split_part(v_pair, ':', 1);
            v_tgt := split_part(v_pair, ':', 2);
            v_ref := v_new ->> v_col;
            CONTINUE WHEN v_ref IS NULL;
            IF EXISTS (SELECT 1 FROM public.test_data_registry r
                       WHERE r.row_id = v_ref
                         AND r.table_name = CASE WHEN v_tgt = 'account' THEN 'auth.users' ELSE v_tgt END) THEN
                v_hit := true;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    IF v_hit THEN
        INSERT INTO public.test_data_registry (table_name, row_id, group_name, label)
        VALUES (TG_TABLE_NAME, v_id, public.test_data_group_for(TG_TABLE_NAME), 'auto')
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_register_test_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF public.is_test_mode() THEN
        INSERT INTO public.test_data_registry (table_name, row_id, group_name, label)
        VALUES ('auth.users', NEW.id::text, 'test_accounts', COALESCE(NEW.email, 'auto'))
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_register_test_account ON auth.users;
CREATE TRIGGER trg_register_test_account AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.tg_register_test_account();

DO $$
DECLARE
    spec record;
BEGIN
    FOR spec IN SELECT * FROM (VALUES
        ('properties',                    ARRAY['partner_id:account', 'created_by:account', 'project_id:projects']),
        ('projects',                      ARRAY['partner_id:account']),
        ('portfolio_items',               ARRAY['partner_id:account']),
        ('partner_finishing_services',    ARRAY['partner_id:account']),
        ('partner_capabilities',          ARRAY['partner_id:account']),
        ('requests',                      ARRAY['customer_id:account']),
        ('request_messages',              ARRAY['request_id:requests', 'sender_id:account']),
        ('request_history',               ARRAY['request_id:requests', 'actor_id:account']),
        ('finishing_request_history',     ARRAY['request_id:requests']),
        ('finishing_request_invitations', ARRAY['request_id:requests', 'partner_id:account']),
        ('finishing_quotes',              ARRAY['request_id:requests', 'partner_id:account']),
        ('finishing_milestones',          ARRAY['request_id:requests']),
        ('execution_attachments',         ARRAY['request_id:requests', 'uploader_id:account']),
        ('notifications',                 ARRAY['user_id:account']),
        ('customer_favorites',            ARRAY['user_id:account']),
        ('analytics_events',              ARRAY['user_id:account', 'partner_id:account', 'property_id:properties']),
        ('transactions',                  ARRAY['user_id:account']),
        ('property_history',              ARRAY['property_id:properties'])
    ) AS t(tbl, args) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_register_test_row ON public.%I', spec.tbl);
        EXECUTE format('CREATE TRIGGER trg_register_test_row AFTER INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_register_test_row(%s)',
                       spec.tbl, (SELECT string_agg(quote_literal(a), ', ') FROM unnest(spec.args) a));
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Admin API
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.test_data_summary()
RETURNS TABLE (group_name text, table_name text, registered bigint, existing bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_exist bigint;
BEGIN
    PERFORM public.assert_test_data_admin();
    FOR r IN SELECT g.group_name AS grp, g.table_name AS tbl, count(*) AS n
             FROM public.test_data_registry g GROUP BY 1, 2 ORDER BY 1, 2 LOOP
        IF r.tbl = 'auth.users' THEN
            SELECT count(*) INTO v_exist FROM auth.users u
            WHERE u.id::text IN (SELECT row_id FROM public.test_data_registry x WHERE x.table_name = 'auth.users' AND x.group_name = r.grp);
        ELSE
            EXECUTE format('SELECT count(*) FROM public.%I WHERE id::text IN (SELECT row_id FROM public.test_data_registry x WHERE x.table_name = %L AND x.group_name = %L)',
                           r.tbl, r.tbl, r.grp) INTO v_exist;
        END IF;
        group_name := r.grp; table_name := r.tbl; registered := r.n; existing := v_exist;
        RETURN NEXT;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.test_data_accounts()
RETURNS TABLE (user_id uuid, email text, name text, role text, group_name text, last_sign_in_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_test_data_admin();
    RETURN QUERY
    SELECT u.id, u.email::text, COALESCE(p.name_ar, p.name_en), p.role, r.group_name, u.last_sign_in_at
    FROM public.test_data_registry r
    JOIN auth.users u ON u.id::text = r.row_id
    LEFT JOIN public.partners p ON p.id = u.id
    WHERE r.table_name = 'auth.users'
    ORDER BY r.group_name, u.email;
END $$;

CREATE OR REPLACE FUNCTION public.set_test_mode(p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.assert_test_data_admin();
    INSERT INTO public.app_runtime_flags (key, value, updated_at, updated_by)
    VALUES ('test_mode', to_jsonb(p_enabled), now(), auth.uid())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = auth.uid();
    RETURN p_enabled;
END $$;

CREATE OR REPLACE FUNCTION public.mark_test_data(p_table text, p_ids text[], p_group text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
    PERFORM public.assert_test_data_admin();
    IF p_table = 'auth.users' AND auth.uid()::text = ANY (p_ids) THEN
        RAISE EXCEPTION 'You cannot mark your own account as test data.';
    END IF;
    INSERT INTO public.test_data_registry (table_name, row_id, group_name, label)
    SELECT p_table, unnest(p_ids), COALESCE(p_group, public.test_data_group_for(p_table)), 'manual'
    ON CONFLICT (table_name, row_id) DO UPDATE SET group_name = EXCLUDED.group_name;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION public.unmark_test_data(p_table text, p_ids text[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
    PERFORM public.assert_test_data_admin();
    DELETE FROM public.test_data_registry WHERE table_name = p_table AND row_id = ANY (p_ids);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN v_n;
END $$;

-- Deletes every registered row (children first), then the registered accounts
-- (which cascades to their partner profile and anything else they own).
-- p_groups NULL = all groups. Never deletes the caller's own account or any
-- super admin that is not explicitly registered.
CREATE OR REPLACE FUNCTION public.purge_test_data(p_confirm text, p_groups text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_tables text[] := ARRAY[
        'request_messages', 'request_history', 'finishing_request_history', 'finishing_request_invitations',
        'finishing_quotes', 'execution_attachments', 'finishing_milestones', 'notifications', 'customer_favorites',
        'analytics_events', 'transactions', 'property_history', 'requests', 'partner_finishing_services',
        'partner_capabilities', 'portfolio_items', 'properties', 'projects'];
    v_tbl text;
    v_n bigint;
    v_result jsonb := '{}'::jsonb;
    v_groups text[] := COALESCE(p_groups, ARRAY['test_accounts', 'demo_staff_accounts', 'content', 'operations']);
BEGIN
    PERFORM public.assert_test_data_admin();
    IF p_confirm IS DISTINCT FROM 'DELETE TEST DATA' THEN
        RAISE EXCEPTION 'Confirmation text must be exactly: DELETE TEST DATA';
    END IF;

    FOREACH v_tbl IN ARRAY v_tables LOOP
        EXECUTE format('DELETE FROM public.%I WHERE id::text IN (SELECT row_id FROM public.test_data_registry WHERE table_name = %L AND group_name = ANY ($1))',
                       v_tbl, v_tbl) USING v_groups;
        GET DIAGNOSTICS v_n = ROW_COUNT;
        IF v_n > 0 THEN v_result := v_result || jsonb_build_object(v_tbl, v_n); END IF;
    END LOOP;

    DELETE FROM auth.users u
    WHERE u.id::text IN (SELECT row_id FROM public.test_data_registry
                         WHERE table_name = 'auth.users' AND group_name = ANY (v_groups))
      AND u.id IS DISTINCT FROM auth.uid();
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN v_result := v_result || jsonb_build_object('accounts', v_n); END IF;

    -- Drop registry entries whose rows no longer exist.
    DELETE FROM public.test_data_registry r
    WHERE r.group_name = ANY (v_groups)
      AND NOT (r.table_name = 'auth.users' AND r.row_id IS NOT DISTINCT FROM auth.uid()::text);

    INSERT INTO public.test_data_purge_log (purged_by, groups, result) VALUES (auth.uid(), v_groups, v_result);
    RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.test_data_summary(), public.test_data_accounts(), public.set_test_mode(boolean),
    public.mark_test_data(text, text[], text), public.unmark_test_data(text, text[]), public.purge_test_data(text, text[])
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.test_data_summary(), public.test_data_accounts(), public.set_test_mode(boolean),
    public.mark_test_data(text, text[], text), public.unmark_test_data(text, text[]), public.purge_test_data(text, text[])
    TO authenticated;
REVOKE ALL ON FUNCTION public.tg_register_test_row(), public.tg_register_test_account(), public.assert_test_data_admin() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Initial classification (2026-11-28): everything currently on the site is
-- trial data except the owner's account. Platform staff demo accounts get
-- their own group so they can be kept if needed.
-- ---------------------------------------------------------------------
INSERT INTO public.test_data_registry (table_name, row_id, group_name, label)
SELECT 'auth.users', u.id::text,
       CASE WHEN u.email IN ('finishing-mgr@onlyhelio.com', 'crm@onlyhelio.com', 'partners@onlyhelio.com',
                             'decor@onlyhelio.com', 'listings-mgr@onlyhelio.com', 'listings@onlyhelio.com')
            THEN 'demo_staff_accounts' ELSE 'test_accounts' END,
       u.email
FROM auth.users u
WHERE u.email IS DISTINCT FROM 'tam.elshafey@gmail.com'
ON CONFLICT DO NOTHING;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['properties', 'projects', 'portfolio_items', 'partner_finishing_services', 'partner_capabilities',
                             'requests', 'request_messages', 'request_history', 'finishing_request_history',
                             'finishing_request_invitations', 'finishing_quotes', 'finishing_milestones', 'execution_attachments',
                             'notifications', 'customer_favorites', 'analytics_events', 'transactions', 'property_history'] LOOP
        EXECUTE format('INSERT INTO public.test_data_registry (table_name, row_id, group_name, label)
                        SELECT %L, id::text, public.test_data_group_for(%L), %L FROM public.%I ON CONFLICT DO NOTHING',
                       t, t, 'initial-classification-20261128', t);
    END LOOP;
END $$;
