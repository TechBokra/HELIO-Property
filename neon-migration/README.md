# Supabase → Neon migration

Neon project: `helio-property` (`icy-voice-49837482`, aws-eu-central-1), database `helio`,
branch `production`. Managed Better Auth + Data API are enabled on it.

## How the copy was made (2026-11-28)

1. `export_fn.sql` creates a temporary, token-gated `public._neon_export(token)` on Supabase
   (replace `__TOKEN__` with a fresh random value). It returns one SQL script built from the
   live catalog: enums, sequences, tables, accounts → `neon_auth."user"` (same UUIDs), all data,
   constraints (FKs to `auth.users` → `neon_auth."user"`), indexes, functions, views, triggers,
   RLS + policies (`anon` → `anonymous`) and grants.
2. Supabase pushes it to Neon in one transaction:
   `select extensions.dblink_exec('<neon url>', 'BEGIN;' || public._neon_export('<token>') || 'COMMIT;')`
   (enable `dblink` first; drop the function and `dblink` afterwards).
3. Verified: 51/51 tables identical by row hash, 127 policies, 40 triggers, 50 FKs.

Compatibility layer on Neon (its `auth` schema is not writable):
- `public.auth_users` view over `neon_auth."user"` — functions that read `auth.users` use it.
- `public.auth_role()` replaces Supabase's `auth.role()` in functions, policies and views.
- `auth.uid()` / `auth.jwt()` are provided by Neon (JWT carries `sub`, `email`, `role`).

Passwords cannot be carried over (different hashing). Every account got a temporary password
(Better Auth scrypt hash written to `neon_auth.account`); users change it after signing in.

## Before switching the live site

- Re-run steps 1–2 against a fresh Neon branch (or truncate) to pick up rows written since.
- Vercel env: `NEON_DATABASE_URL` (server only; used by /api/admin/credentials and /api/catalog).
- Add the production domain(s) to Neon Auth trusted domains.
- Rotate the Neon owner password once the migration is finished.
