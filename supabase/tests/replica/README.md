# Production replica rehearsal

`production_schema_snapshot_20261127.sql` is the production schema (tables, constraints,
indexes, functions, triggers, views, RLS policies, default privileges) captured from the
live database on 2026-11-27. It contains **no data**. `synthetic_seed.sql` adds fake rows
with the same role/type/status distribution as production (mixed-case roles included).

Rehearse every migration against it before applying to production:

```bash
createdb prodbase && psql -d prodbase -c "alter database prodbase set search_path = public, extensions"
psql -d prodbase -f production_schema_snapshot_20261127.sql
psql -d prodbase -f synthetic_seed.sql
./rehearse.sh            # applies supabase/migrations/*.sql in order, stops on first error
psql -d rh -f persona_write_checks.sql
```
