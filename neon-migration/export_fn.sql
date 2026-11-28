-- TEMPORARY: one-off export of the public schema + data for the Neon migration.
-- Gated by a token, dropped right after the transfer.
CREATE OR REPLACE FUNCTION public._neon_export(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  o text := '';
  r record;
  j text;
  roles text;
  def text;
BEGIN
  IF p_token IS DISTINCT FROM '__TOKEN__' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 0. prelude + compatibility layer (auth schema is not writable on Neon)
  o := o || $p$
SET check_function_bodies = off;
SET client_min_messages = warning;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS _migration_backup;
$p$;

  -- 1. enums, sequences, tables (public + backups)
  FOR r IN
    SELECT format('CREATE TYPE public.%I AS ENUM (%s);', t.typname,
             (SELECT string_agg(quote_literal(e.enumlabel), ',' ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid)) AS ddl
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  FOR r IN
    SELECT format('CREATE SEQUENCE %I.%I;', n.nspname, c.relname) AS ddl
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public','_migration_backup') AND c.relkind = 'S' ORDER BY 1
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  FOR r IN
    SELECT format('CREATE TABLE %I.%I (%s);', n.nspname, c.relname,
             (SELECT string_agg(format('%I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
                       CASE WHEN d.adbin IS NOT NULL THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid) END,
                       CASE WHEN a.attnotnull THEN ' NOT NULL' END), ', ' ORDER BY a.attnum)
              FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
              WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped)) AS ddl
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public','_migration_backup') AND c.relkind = 'r'
    ORDER BY n.nspname DESC, c.relname
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  -- 2a. accounts -> neon_auth."user" (same UUIDs; passwords are set separately)
  SELECT json_agg(json_build_object(
           'id', u.id, 'email', lower(u.email),
           'name', coalesce(nullif(u.raw_user_meta_data->>'full_name',''), nullif(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1)),
           'emailVerified', true, 'createdAt', u.created_at, 'updatedAt', coalesce(u.updated_at, u.created_at)))::text
    INTO j FROM auth.users u WHERE u.email IS NOT NULL AND u.deleted_at IS NULL;
  o := o || format('INSERT INTO neon_auth."user" (id, email, name, "emailVerified", "createdAt", "updatedAt") SELECT id, email, name, "emailVerified", "createdAt", "updatedAt" FROM json_to_recordset($neonjson$%s$neonjson$) AS x(id uuid, email text, name text, "emailVerified" boolean, "createdAt" timestamptz, "updatedAt" timestamptz);', j) || E'\n';

  -- 2. data (before constraints and triggers, so no trigger side effects)
  FOR r IN
    SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public','_migration_backup') AND c.relkind = 'r' ORDER BY 1, 2
  LOOP
    IF r.nspname = 'public' AND r.relname = 'transactions' THEN
      EXECUTE 'SELECT json_agg(x)::text FROM (SELECT t.*, NULL AS _x FROM public.transactions t) s, LATERAL (SELECT (to_jsonb(s) - ''_x'' || CASE WHEN s.receipt_url LIKE ''data:%'' THEN jsonb_build_object(''receipt_url'', NULL) ELSE ''{}''::jsonb END) AS x) l' INTO j;
    ELSE
      EXECUTE format('SELECT json_agg(t)::text FROM %I.%I t', r.nspname, r.relname) INTO j;
    END IF;
    IF j IS NOT NULL THEN
      o := o || format('INSERT INTO %I.%I SELECT * FROM json_populate_recordset(NULL::%I.%I, $neonjson$%s$neonjson$);', r.nspname, r.relname, r.nspname, r.relname, j) || E'\n';
    END IF;
  END LOOP;

  FOR r IN
    SELECT format('SELECT setval(%L, %s, true);', n.nspname || '.' || c.relname, s.last_value) AS ddl
    FROM pg_sequences s JOIN pg_namespace n ON n.nspname = s.schemaname JOIN pg_class c ON c.relname = s.sequencename AND c.relnamespace = n.oid
    WHERE n.nspname IN ('public','_migration_backup') AND s.last_value IS NOT NULL
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  -- 3. constraints: non-FK first, then FK (auth.users -> neon_auth."user")
  FOR r IN
    SELECT format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s;', n.nspname, c.relname, k.conname,
             CASE WHEN k.contype = 'f' THEN replace(pg_get_constraintdef(k.oid), 'REFERENCES auth.users(id)', 'REFERENCES neon_auth."user"(id)')
                  ELSE pg_get_constraintdef(k.oid) END) AS ddl
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND k.contype IN ('p','u','c','x','f')
    ORDER BY (k.contype = 'f'), c.relname, k.conname
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  -- 4. indexes not backing constraints
  FOR r IN
    SELECT pg_get_indexdef(i.indexrelid) || ';' AS ddl
    FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conindid = i.indexrelid)
    ORDER BY 1
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  -- 5. compatibility objects + functions
  o := o || $p$
CREATE OR REPLACE VIEW public.auth_users AS
  SELECT u.id, u.email, u."createdAt" AS created_at, u."updatedAt" AS updated_at,
         jsonb_build_object('full_name', u.name, 'name', u.name) AS raw_user_meta_data
  FROM neon_auth."user" u;
REVOKE ALL ON public.auth_users FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.auth_role() RETURNS text
LANGUAGE sql STABLE AS $r$
  SELECT CASE WHEN auth.jwt() IS NOT NULL THEN 'authenticated'
              WHEN session_user = 'authenticator' THEN 'anon'
              ELSE 'service_role' END
$r$;
$p$;

  FOR r IN
    SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f','p') AND p.proname <> '_neon_export'
    ORDER BY p.proname
  LOOP
    def := pg_get_functiondef(r.oid);
    def := regexp_replace(def, '(FROM|JOIN)(\s+)auth\.users', '\1\2public.auth_users', 'gi');
    def := replace(def, 'auth.role()', 'public.auth_role()');
    o := o || def || E';\n';
  END LOOP;

  -- 6. views
  FOR r IN
    SELECT format('CREATE OR REPLACE VIEW public.%I %sAS %s', c.relname,
             CASE WHEN c.reloptions IS NOT NULL THEN 'WITH (' || array_to_string(c.reloptions, ',') || ') ' ELSE '' END,
             replace(pg_get_viewdef(c.oid), 'auth.role()', 'public.auth_role()')) AS ddl
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v' ORDER BY c.relname
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  -- 7. triggers
  FOR r IN
    SELECT pg_get_triggerdef(t.oid) || ';' AS ddl
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal ORDER BY c.relname, t.tgname
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  -- 8. RLS + policies (anon -> anonymous)
  FOR r IN
    SELECT format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', c.relname) ||
           CASE WHEN c.relforcerowsecurity THEN format(' ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', c.relname) ELSE '' END AS ddl
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity ORDER BY c.relname
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  FOR r IN
    SELECT p.* FROM pg_policies p WHERE p.schemaname = 'public' ORDER BY p.tablename, p.policyname
  LOOP
    SELECT string_agg(CASE x WHEN 'anon' THEN 'anonymous' WHEN 'public' THEN 'public' ELSE quote_ident(x) END, ', ')
      INTO roles FROM unnest(r.roles) x WHERE x <> 'service_role';
    IF roles IS NULL THEN CONTINUE; END IF;
    o := o || format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
                     r.policyname, r.tablename, r.permissive, r.cmd, roles,
                     CASE WHEN r.qual IS NOT NULL THEN ' USING (' || replace(r.qual, 'auth.role()', 'public.auth_role()') || ')' ELSE '' END,
                     CASE WHEN r.with_check IS NOT NULL THEN ' WITH CHECK (' || replace(r.with_check, 'auth.role()', 'public.auth_role()') || ')' ELSE '' END) || E'\n';
  END LOOP;

  -- 9. grants (anon -> anonymous; service_role / postgres dropped)
  o := o || 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC; REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;' || E'\n';
  o := o || 'GRANT USAGE ON SCHEMA public TO anonymous, authenticated;' || E'\n';
  FOR r IN
    SELECT format('GRANT %s ON TABLE public.%I TO %s;', string_agg(DISTINCT g.privilege_type, ', '), g.table_name,
             CASE g.grantee WHEN 'anon' THEN 'anonymous' ELSE g.grantee END) AS ddl
    FROM information_schema.role_table_grants g
    WHERE g.table_schema = 'public' AND g.grantee IN ('anon','authenticated')
    GROUP BY g.table_name, g.grantee
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  FOR r IN
    SELECT format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO %s;', c.relname, CASE a.grantee::regrole::text WHEN 'anon' THEN 'anonymous' ELSE a.grantee::regrole::text END) AS ddl
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
    WHERE n.nspname = 'public' AND c.relkind = 'S' AND a.grantee <> 0 AND a.grantee::regrole::text IN ('anon','authenticated')
    GROUP BY c.relname, a.grantee
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  FOR r IN
    SELECT DISTINCT format('GRANT EXECUTE ON FUNCTION %s TO %s;', p.oid::regprocedure,
             CASE WHEN a.grantee = 0 THEN 'PUBLIC' WHEN a.grantee::regrole::text = 'anon' THEN 'anonymous' ELSE a.grantee::regrole::text END) AS ddl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
         aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE n.nspname = 'public' AND p.prokind IN ('f','p') AND p.proname <> '_neon_export'
      AND a.privilege_type = 'EXECUTE'
      AND (a.grantee = 0 OR a.grantee::regrole::text IN ('anon','authenticated'))
  LOOP o := o || r.ddl || E'\n'; END LOOP;

  RETURN o;
END
$fn$;

REVOKE ALL ON FUNCTION public._neon_export(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._neon_export(text) TO anon;
