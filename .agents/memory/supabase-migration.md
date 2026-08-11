---
name: Supabase database migration
description: Production database migrated from Replit-managed PostgreSQL to Supabase. Connection details and migration approach documented here.
---

## The rule
The production database is now on Supabase (project: novacrest-capital, ref: saizlvygwnrvyyvekwrs). It is no longer dependent on Replit's managed PostgreSQL.

**Why:** Replit-managed PostgreSQL becomes unreachable if the Replit account is suspended. Supabase is independent and free-tier.

## Connection details (non-sensitive structure)
- **Supabase project ref:** `saizlvygwnrvyyvekwrs`
- **Region:** `us-east-1`
- **Org:** Mazi (`dcxqpuqfpymxkkfrphmg`)
- **Pooler host:** `aws-0-us-east-1.pooler.supabase.com:6543` (transaction mode, sslmode=require)
- **Direct DB host:** `db.saizlvygwnrvyyvekwrs.supabase.co:5432` — NOT reachable from Replit (DNS doesn't resolve); use pooler instead
- **Railway env var:** `DATABASE_URL` set on service `306cd67c` (api-server), environment `9d6e4e28` (production), project `3ef10ab5` (industrious-harmony)

## Migration approach
- psql direct connection to `db.*.supabase.co` fails from Replit (DNS not resolving)
- Supabase Management API SQL endpoint (`POST /v1/projects/{ref}/database/query`) works for queries but gets Cloudflare 403 for large payloads
- **Working path:** `psql` via the Supabase transaction pooler (`aws-0-us-east-1.pooler.supabase.com:6543`) with `sslmode=require` — this resolves and connects fine
- Used `pg_dump --inserts` (not COPY format) then `psql pooler_url -f dump.sql`

## How to apply
- Dev environment still uses Replit's managed DATABASE_URL (runtime-managed, can't be overridden)
- Production (Railway) uses Supabase via the pooler URL
- To run future migrations against production Supabase DB: `psql "postgresql://postgres.saizlvygwnrvyyvekwrs:...@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "..."`
- To update Railway DATABASE_URL: use `variableCollectionUpsert` mutation with projectId `3ef10ab5...`, environmentId `9d6e4e28...`, serviceId `306cd67c...`
