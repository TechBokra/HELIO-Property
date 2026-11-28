-- Removes the sample content added by 20261128c_content_enrichment_seed.sql
-- and restores the previous quotes and partner profile fields.
-- Run in the Supabase SQL editor when the real content is ready.
BEGIN;

DELETE FROM public.properties WHERE id::text IN (SELECT row_id FROM _migration_backup.seed_rows_20261128 WHERE tbl = 'properties');
DELETE FROM public.projects WHERE id::text IN (SELECT row_id FROM _migration_backup.seed_rows_20261128 WHERE tbl = 'projects');
DELETE FROM public.partner_finishing_services WHERE id::text IN (SELECT row_id FROM _migration_backup.seed_rows_20261128 WHERE tbl = 'partner_finishing_services');
DELETE FROM public.partner_capabilities WHERE id::text IN (SELECT row_id FROM _migration_backup.seed_rows_20261128 WHERE tbl = 'partner_capabilities');
DELETE FROM public.decoration_categories d
WHERE d.id::text IN (SELECT row_id FROM _migration_backup.seed_rows_20261128 WHERE tbl = 'decoration_categories')
  AND NOT EXISTS (SELECT 1 FROM public.portfolio_items pi WHERE pi.category_id = d.id);

UPDATE public.partners p
SET description_ar = b.description_ar,
    description_en = b.description_en,
    profile_kind = b.profile_kind,
    allowed_cities = b.allowed_cities
FROM _migration_backup.partners_20261128 b
WHERE b.id = p.id;

-- Restore only the quotes list (other CMS edits made since are kept).
UPDATE public.site_content s
SET content = CASE WHEN b.content ? 'quotes' THEN jsonb_set(s.content, '{quotes}', b.content -> 'quotes') ELSE s.content - 'quotes' END
FROM _migration_backup.site_content_20261128 b
WHERE s.key = 'main_content' AND b.key = 'main_content';

DELETE FROM _migration_backup.seed_rows_20261128;
COMMIT;
