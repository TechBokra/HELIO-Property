-- =============================================================================
-- Migration: 20261124_site_content_atomic_merge.sql
-- Purpose: Provide atomic, section-safe JSONB deep-merge updates for
--          public.site_content so saving one section (e.g. hero) never
--          overwrites newer concurrent updates in another section (e.g. footer),
--          while strictly preserving existing RLS enforcement (SECURITY INVOKER).
-- =============================================================================

BEGIN;

-- 1. Recursive JSONB deep-merge helper:
--    - Plain JSON objects are merged recursively key-by-key.
--    - Arrays and scalar values in `patch` replace the corresponding key in `target`.
CREATE OR REPLACE FUNCTION public.jsonb_deep_merge(target jsonb, patch jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
    SELECT CASE
        WHEN patch IS NULL THEN target
        WHEN jsonb_typeof(patch) <> 'object' THEN patch
        WHEN target IS NULL OR jsonb_typeof(target) <> 'object' THEN patch
        ELSE COALESCE(
            (
                SELECT jsonb_object_agg(
                    k,
                    CASE
                        WHEN (patch ? k) AND (target ? k) THEN public.jsonb_deep_merge(target -> k, patch -> k)
                        WHEN (patch ? k) THEN patch -> k
                        ELSE target -> k
                    END
                )
                FROM (
                    SELECT jsonb_object_keys(target) AS k
                    UNION
                    SELECT jsonb_object_keys(patch) AS k
                ) keys
            ),
            '{}'::jsonb
        )
    END;
$$;

-- 2. Atomic section-level merge RPC for public.site_content
--    Uses SECURITY INVOKER so existing RLS policies on public.site_content
--    (restricting writes to active super_admin / content_manager) remain authoritative.
CREATE OR REPLACE FUNCTION public.merge_site_content(p_key text, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated jsonb;
BEGIN
    IF p_key IS NULL OR btrim(p_key) = '' THEN
        RAISE EXCEPTION 'Invalid site_content key';
    END IF;

    IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
        RAISE EXCEPTION 'Invalid site_content patch: JSON object required';
    END IF;

    INSERT INTO public.site_content (key, content, updated_at)
    VALUES (p_key, p_patch, timezone('utc'::text, now()))
    ON CONFLICT (key) DO UPDATE
    SET content = public.jsonb_deep_merge(public.site_content.content, EXCLUDED.content),
        updated_at = timezone('utc'::text, now())
    RETURNING content INTO v_updated;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.jsonb_deep_merge(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jsonb_deep_merge(jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.merge_site_content(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_site_content(text, jsonb) TO authenticated;

COMMIT;
