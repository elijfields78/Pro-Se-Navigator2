---
name: Phase 5a DB architecture
description: DATABASE_URL in this project points to Replit's built-in Postgres (helium), NOT Supabase. Critical for retrieval/pg work.
---

## Rule
The Replit environment injects `DATABASE_URL=postgresql://postgres:password@helium/heliumdb?sslmode=disable` (Replit built-in Postgres). This is what `pg.Pool` connects to from any code or script in the workspace. It is NOT the Supabase database.

**Why:** Replit automatically provides DATABASE_URL for its built-in Postgres. The Supabase connection string lives in `SUPABASE_DB_PASSWORD` (a full `postgresql://` URL pointing at `db.prhhgvciwooquuuulkyb.supabase.co`), which has no reliable public DNS from Replit's network and cannot be used for direct pg connections.

**How to apply:**
- Retrieval (Phase 5a) legal corpus tables (`legal_sources`, `legal_chunks`) live in the **Replit DB** (`helium/heliumdb`), not Supabase.
- User data (cases, messages, deadlines, etc.) lives in **Supabase**, accessed only via supabase-js HTTP API.
- `002_legal_corpus.sql` was written for Supabase (with RLS + `authenticated` role). An adapted version WITHOUT the RLS policies was applied to the Replit DB — the Replit DB has no `authenticated` role.
- To re-run ingestion: `pnpm --filter @workspace/scripts run ingest:legal-corpus` (DATABASE_URL is always set by Replit's workflow env).
- Confirmed row counts after initial ingest: 15 `legal_sources`, 20 `legal_chunks`.
- FTS retrieval confirmed working via `POST /api/retrieval/search` on port 8080.
