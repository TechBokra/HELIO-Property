# Production database reconcile — 2026-11-27

Project: **Helio property** (`xyyvgpchkznznwbxbgrp`).

## Before

Production had been created from an older schema and had **none** of the
`20260929+` migrations in `supabase/migrations/`:

- no `cities`, `finishing_services`, `analytics_events`, `credential_audit_log`,
  `request_history`, `property_history`, `partner_leads_view`
- `partners.role` stored mixed case (`FINISHING_PARTNER`, `super_admin`, …) while
  every policy compares lowercase, so upper-case managers were not recognised
- any partner could change their own `role` to `super_admin`
- `partners`, `properties`, `projects` had `USING (true)` policies (drafts and
  pending accounts were public); anyone could insert notifications
- `finishing_quotes` and `partner_capabilities` had RLS on with **no** policies
  (quotes did not work for any client)

## What was applied (in order, each as one transaction)

| Supabase migration name | Repo files |
|---|---|
| `20260928_production_baseline` | `20260928_production_baseline.sql` |
| `20260929_finishing_domain_hardening` | `20260929_finishing_domain_hardening.sql` |
| `reconcile_b1_20260930_requests_audit` | `20260930_*` (2 files) + request_history FK fix from `20261127z` |
| `reconcile_b2_20261001_20261002_decorations_partners` | `20261001_*`, `20261002_*` (6 files) + non-recursive partners policies |
| `reconcile_b3a_20261003_customer_identity_favorites` | `20261003_*` (2 files) |
| `reconcile_b3b_20261004_20261010_journey_execution_analytics` | `20261004` → `20261010` (7 files) |
| `reconcile_b4_20261014_20261126_permissions_multicity_catalog` | `20261014`, `20261015`, `20261124`, `20261125`, `20261126` |
| `reconcile_b5_20261127_multicity_governance_and_legacy_cleanup` | `20261127_multi_city_governance_rls.sql` + `20261127z_legacy_policy_cleanup.sql` |
| `20261128_finishing_marketplace_foundation` | `20261128_finishing_marketplace_foundation.sql` |
| `20261128b_history_and_capabilities_policies` | `20261128b_history_and_capabilities_policies.sql` |

Files were grouped so that production was never left in a broken intermediate
state (e.g. the recursive `partners` policies introduced in `20261002` are
replaced inside the same transaction). Definitions that were superseded within
the same batch were not re-sent; the end state was verified instead:

- policies, columns and function definitions hashed on production and on a local
  replica that ran every repo file in order → **identical**
- health probe after every batch: partner reads `partners`, anonymous lead
  intake, signed-in customer request — all passed
- marketplace RLS checks executed on production inside a rolled-back block
  (9/9 passed), no test rows left behind

## Data changes

- `partners.role` / `partners.status` lowercased (25 rows)
- `properties.publication_status` backfilled so visible listings stay visible
- `transactions.status = 'completed'` → `'paid'` (2 rows)
- `finishing_services` populated from `site_content.main_content.finishingServices` (3 rows)

Originals: schema `_migration_backup` (`partner_roles_20260928`,
`policies_20260928`, `functions_20260928`, `views_20260928`,
`transactions_status_20260928`). Not exposed to `anon`/`authenticated`.

## Remaining advisor notes (accepted / follow-up)

- `security_definer_view` on `partner_leads_view`: intentional — it masks customer
  contact data itself and must see invited tenders that requests RLS hides.
  Granted to `authenticated` only.
- Legacy PascalCase tables (`Banner`, `Transaction`, …) have RLS with no policies
  (deny all). They are unused by the app; drop when convenient.
- SECURITY DEFINER functions are executable by `anon` through Supabase default
  grants; each checks the caller internally. Tightening is a follow-up.
- Enable leaked-password protection in Supabase Auth settings.
