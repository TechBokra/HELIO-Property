-- =============================================================================
-- MIGRATION: 20260928_production_baseline.sql
-- PURPOSE: Bring the live production database (created from an older schema)
--          to the baseline that the 20260929+ migrations in this repository
--          expect. Runs before every other migration and is idempotent.
--
--   1. Snapshot current roles, policies and functions into _migration_backup
--      (rollback reference; nothing is deleted from it automatically).
--   2. Normalize partners.role to lowercase. Production stores a mix of
--      'FINISHING_PARTNER' and 'super_admin'; every RLS policy and the app's
--      role mapping compare lowercase values, so upper-case managers were not
--      being recognized by the database.
--   3. Create public.property_history (defined only in schema.sql).
--   4. Add the property / decoration columns the application already reads.
--   5. Backfill publication/availability status of existing listings so that
--      nothing that is visible today becomes hidden.
-- =============================================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Rollback snapshot
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS _migration_backup;
REVOKE ALL ON SCHEMA _migration_backup FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON SCHEMA _migration_backup FROM anon, authenticated';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS _migration_backup.partner_roles_20260928 AS
SELECT id, role, type, status, NOW() AS captured_at FROM public.partners;

CREATE TABLE IF NOT EXISTS _migration_backup.policies_20260928 AS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check, NOW() AS captured_at
FROM pg_policies WHERE schemaname = 'public';

CREATE TABLE IF NOT EXISTS _migration_backup.functions_20260928 AS
SELECT p.proname, pg_get_functiondef(p.oid) AS definition, NOW() AS captured_at
FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f';

CREATE TABLE IF NOT EXISTS _migration_backup.views_20260928 AS
SELECT viewname, definition, NOW() AS captured_at FROM pg_views WHERE schemaname = 'public';

-- ---------------------------------------------------------------------------
-- 2. Canonical lowercase roles
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- Only when role is plain text (production). Enum-based schemas are already canonical.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'role' AND data_type = 'text'
    ) THEN
        UPDATE public.partners SET role = lower(btrim(role)) WHERE role IS DISTINCT FROM lower(btrim(role));
        UPDATE public.partners SET status = lower(btrim(status)) WHERE status IS DISTINCT FROM lower(btrim(status));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Property audit history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    changed_by TEXT NOT NULL,
    change_type TEXT,
    field_name TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_property_history_prop ON public.property_history(property_id);
ALTER TABLE public.property_history ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS reference_number TEXT,
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'partner_direct',
    ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available',
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_price_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_availability_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_source_request ON public.properties(source_request_id);
CREATE INDEX IF NOT EXISTS idx_properties_reference ON public.properties(reference_number);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug);

ALTER TABLE public.decoration_categories
    ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 5. Keep existing listings exactly as visible as they are today
-- ---------------------------------------------------------------------------
UPDATE public.properties
SET publication_status = CASE
        WHEN listing_status::text IN ('active', 'sold') THEN 'published'
        WHEN listing_status::text = 'inactive' THEN 'archived'
        ELSE 'draft'
    END
WHERE publication_status IS NULL OR publication_status = 'draft';

UPDATE public.properties
SET availability_status = CASE WHEN listing_status::text = 'sold' THEN 'sold' ELSE 'available' END
WHERE availability_status IS NULL OR (listing_status::text = 'sold' AND availability_status <> 'sold');

UPDATE public.properties
SET verification_status = 'verified', verified_at = COALESCE(verified_at, updated_at)
WHERE is_verified = TRUE AND verification_status IS DISTINCT FROM 'verified';

COMMIT;
