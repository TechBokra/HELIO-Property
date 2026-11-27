-- =============================================================================
-- MIGRATION: 20261127z_legacy_policy_cleanup.sql
-- PURPOSE: Finish reconciling the production database with this repository.
--
--   1. Non-recursive partners policies. The repository versions of
--      "Admins view all partners", "Admins update partners" and
--      "Users insert own profile or admins insert any" query public.partners
--      from inside a public.partners policy, which Postgres rejects with
--      "infinite recursion detected" for every authenticated read (login,
--      dashboards, and every other policy that looks up the caller's role).
--      They are recreated on top of SECURITY DEFINER helpers.
--   2. Drop legacy production policies that pre-date the hardening migrations
--      and silently widen access (permissive policies are OR'ed), e.g.
--      partners/properties/projects "USING (true)" and public notification inserts.
--
-- Rollback reference: _migration_backup.policies_20260928.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helpers (read public.partners without re-entering its RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_partner_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT lower(p.role::text)
    FROM public.partners p
    WHERE p.id = auth.uid() AND p.status::text = 'active';
$$;
REVOKE ALL ON FUNCTION public.current_partner_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_partner_role() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_partner_allowed_cities()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(p.allowed_cities, ARRAY[]::TEXT[])
    FROM public.partners p
    WHERE p.id = auth.uid() AND p.status::text = 'active';
$$;
REVOKE ALL ON FUNCTION public.current_partner_allowed_cities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_partner_allowed_cities() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. partners
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view partners" ON public.partners;              -- USING (true): exposed pending/disabled accounts
DROP POLICY IF EXISTS "Users can read own profile" ON public.partners;            -- covered by "Admins view all partners"
DROP POLICY IF EXISTS "Users can insert own profile" ON public.partners;          -- covered by repo insert policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.partners;          -- duplicate of "Partners update own profile"
DROP POLICY IF EXISTS "Admins have full access to partners" ON public.partners;   -- legacy is_admin() included content/service managers

DROP POLICY IF EXISTS "Admins view all partners" ON public.partners;
CREATE POLICY "Admins view all partners"
ON public.partners FOR SELECT TO authenticated
USING (
    auth.uid() = id
    OR public.current_partner_role() = 'super_admin'
    OR (
        public.current_partner_role() IN ('partner_relations_manager', 'service_manager', 'content_manager')
        AND (
            '*' = ANY (public.current_partner_allowed_cities())
            OR partners.allowed_cities && public.current_partner_allowed_cities()
        )
    )
);

DROP POLICY IF EXISTS "Admins update partners" ON public.partners;
CREATE POLICY "Admins update partners"
ON public.partners FOR UPDATE TO authenticated
USING (
    auth.uid() = id
    OR public.current_partner_role() IN ('super_admin', 'partner_relations_manager')
);

DROP POLICY IF EXISTS "Users insert own profile or admins insert any" ON public.partners;
CREATE POLICY "Users insert own profile or admins insert any"
ON public.partners FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = id
    OR public.current_partner_role() IN ('super_admin', 'partner_relations_manager')
);

-- ---------------------------------------------------------------------------
-- 2. properties: repo policies are "Public properties are viewable by everyone",
--    "Partners manage their own properties", "Admins manage all properties"
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view properties" ON public.properties;          -- USING (true): exposed drafts
DROP POLICY IF EXISTS "Owners can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins have full access to properties" ON public.properties;

-- ---------------------------------------------------------------------------
-- 3. projects: repo policies are "Projects select/insert/update/delete policy"
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins have full access to projects" ON public.projects;

-- ---------------------------------------------------------------------------
-- 4. notifications: anyone could insert a notification for any user.
--    System notifications go through public.send_system_notification().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;     -- duplicate of "Users view own notifications"

-- ---------------------------------------------------------------------------
-- 5. request_history.actor_id referenced public.partners, but the audit
--    trigger (trg_log_request_mutation) records auth.uid() for customers too.
--    A signed-in customer without a partners row would fail to create or
--    update any request. The audit trail references auth.users instead.
-- ---------------------------------------------------------------------------
ALTER TABLE public.request_history DROP CONSTRAINT IF EXISTS request_history_actor_id_fkey;
ALTER TABLE public.request_history
    ADD CONSTRAINT request_history_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;
