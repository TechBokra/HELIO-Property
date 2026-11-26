-- =============================================================================
-- Read-Only Diagnostic SQL: Catalog & Pending Migrations Inspection
-- Purpose: Inspect Supabase schema state without modifying any data or DDL.
-- Safe to run in Supabase SQL Editor on any environment.
-- =============================================================================

-- 1. Check required tables across catalog, multi-city, and finishing/decorations
SELECT
    t.table_name,
    EXISTS (
        SELECT 1
        FROM information_schema.tables ist
        WHERE ist.table_schema = 'public'
          AND ist.table_name = t.table_name
    ) AS exists_in_public,
    t.expected_migration
FROM (
    VALUES
        ('properties', 'base schema'),
        ('projects', 'base schema'),
        ('partners', 'base schema'),
        ('property_types', 'base schema'),
        ('finishing_statuses', 'base schema'),
        ('amenities', 'base schema'),
        ('site_content', 'base schema'),
        ('requests', 'base schema'),
        ('cities', '20261015_multi_city_only_property_architecture.sql'),
        ('finishing_services', '20260929_finishing_domain_hardening.sql'),
        ('decoration_categories', '20261001_decorations_domain_hardening.sql'),
        ('portfolio_items', '20261001_decorations_domain_hardening.sql'),
        ('property_history', '20261125 / property history audit')
) AS t(table_name, expected_migration)
ORDER BY t.expected_migration, t.table_name;

-- 2. Check required columns added by recent migrations
SELECT
    c.table_name,
    c.column_name,
    EXISTS (
        SELECT 1
        FROM information_schema.columns isc
        WHERE isc.table_schema = 'public'
          AND isc.table_name = c.table_name
          AND isc.column_name = c.column_name
    ) AS column_exists,
    c.expected_migration
FROM (
    VALUES
        ('properties', 'city_id', '20261015_multi_city_only_property_architecture.sql'),
        ('projects', 'city_id', '20261015_multi_city_only_property_architecture.sql'),
        ('partners', 'allowed_cities', '20261015_multi_city_only_property_architecture.sql'),
        ('requests', 'city_id', '20261015_multi_city_only_property_architecture.sql'),
        ('properties', 'source_request_id', '20261125_property_listing_bidirectional_link.sql'),
        ('finishing_services', 'target_partner_id', '20261126_finishing_decorations_catalog_linking.sql'),
        ('portfolio_items', 'category_id', '20261126_finishing_decorations_catalog_linking.sql'),
        ('cities', 'content_overrides', '20261127_multi_city_governance_rls.sql')
) AS c(table_name, column_name, expected_migration)
ORDER BY c.expected_migration, c.table_name, c.column_name;

-- 3. Check recorded Supabase CLI migrations (if supabase_migrations schema exists)
SELECT
    sm.version,
    sm.name
FROM supabase_migrations.schema_migrations sm
ORDER BY sm.version;

-- 4. Read-only count of properties by listing_status
SELECT
    listing_status,
    COUNT(*) AS total_rows
FROM public.properties
GROUP BY listing_status
ORDER BY total_rows DESC;

-- 5. Active RLS policies on catalog tables
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('properties', 'projects', 'partners', 'cities', 'finishing_services')
ORDER BY tablename, policyname;
