-- =============================================================================
-- Migration: 20261125_property_listing_bidirectional_link.sql
-- Purpose: Ensure authoritative bidirectional traceability & idempotent single-draft
--          creation when approving public property listing requests.
--          1. Ensures public.properties.source_request_id exists with FK to public.requests(id).
--          2. Backfills source_request_id safely from legacy metadata/payload links.
--          3. Enforces database-level uniqueness (at most one draft property per listing request).
-- =============================================================================

BEGIN;

-- 1. Ensure source_request_id exists on public.properties
ALTER TABLE IF EXISTS public.properties
    ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL;

-- 2. Safely backfill legacy metadata links where source_request_id is currently NULL
--    (Only link valid UUIDs that reference existing rows in public.requests, keeping earliest row per request)
WITH meta_links AS (
    SELECT DISTINCT ON (req.id)
        p.id AS property_id,
        req.id AS request_id
    FROM public.properties p
    JOIN public.requests req
      ON (
          (p.installments_info -> '_meta' ->> 'sourceRequestId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND req.id = (p.installments_info -> '_meta' ->> 'sourceRequestId')::uuid
      )
    WHERE p.source_request_id IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.properties existing
          WHERE existing.source_request_id = req.id
      )
    ORDER BY req.id, p.created_at ASC
)
UPDATE public.properties p
SET source_request_id = ml.request_id
FROM meta_links ml
WHERE p.id = ml.property_id
  AND p.source_request_id IS NULL;

-- Also backfill from requests.payload->>'createdPropertyId' if still unlinked on properties side
WITH request_links AS (
    SELECT DISTINCT ON (req.id)
        (req.payload ->> 'createdPropertyId')::uuid AS property_id,
        req.id AS request_id
    FROM public.requests req
    WHERE req.type = 'PROPERTY_LISTING_REQUEST'
      AND (req.payload ->> 'createdPropertyId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND NOT EXISTS (
          SELECT 1 FROM public.properties existing
          WHERE existing.source_request_id = req.id
      )
    ORDER BY req.id, req.created_at ASC
)
UPDATE public.properties p
SET source_request_id = rl.request_id
FROM request_links rl
WHERE p.id = rl.property_id
  AND p.source_request_id IS NULL;

-- 3. Enforce idempotency / single-draft guarantee at the database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_properties_source_request_id
    ON public.properties (source_request_id)
    WHERE source_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_type_created_at
    ON public.requests (type, created_at DESC);

COMMIT;
