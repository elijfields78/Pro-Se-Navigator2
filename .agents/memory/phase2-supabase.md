---
name: Phase 2 Supabase backend
description: Auth replaced with Supabase; CasesContext uses Supabase REST tables with RLS; legal corpus now lives in Supabase via session pooler.
---

## Auth
- Supabase auth (supabase-js) replaces the original mock auth.
- Env vars: SUPABASE_URL (REST endpoint), SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
- Expo vars: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY.

## User-data tables (Supabase, migration 001)
- `cases`, `messages`, `deadlines`, `verified_authorities`, `artifacts`
- RLS: per-user via `auth.uid()`.

## Legal corpus tables (Supabase, migrations 002 + 003)
- `legal_sources`, `legal_chunks` (with generated FTS tsvector + GIN index)
- Applied via psql session pooler in Phase 5a.
- Row counts after seed: 15 sources, 20 chunks.
- RLS: authenticated read; service-role-only write.

## Connectivity (critical)
- Direct Postgres host (`db.<project-id>.supabase.co:5432`) → ENOTFOUND from Replit. Do NOT use.
- Session pooler (`aws-1-us-west-2.pooler.supabase.com:5432`) → reachable from Replit. Use SUPABASE_POOLER_URL.
- SUPABASE_DB_PASSWORD holds the direct URL (unusable for TCP); kept as last-resort fallback only.
- psql requires `PGSSLMODE=require` when using the pooler URL.

## db.ts connection priority (api-server)
1. SUPABASE_POOLER_URL (session pooler, IPv4-compatible) ← preferred
2. DATABASE_URL (Replit helium, local dev only)
3. SUPABASE_DB_PASSWORD (direct host, not reachable)

## Apple auth note
- Apple Sign-In requires a registered App ID; not yet wired up.
