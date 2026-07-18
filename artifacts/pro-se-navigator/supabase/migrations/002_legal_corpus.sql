-- ============================================================
-- Pro Se Navigator — Phase 5a: legal corpus (RAG retrieval)
-- Run in Supabase SQL Editor after 001_initial.sql.
--
-- Shared, read-only reference law (FRCP/FRAP/FRE + FCRA). Unlike the
-- per-user case tables, this corpus is the SAME for every user:
--   * any authenticated user may SELECT it
--   * only the service role / ingestion job may write it (no write policy →
--     RLS denies writes to anon & authenticated; service_role bypasses RLS)
-- ============================================================

-- pgvector: enabled now so Phase 5b (semantic embeddings) needs no new migration
-- to install the extension. The vector COLUMN is deliberately deferred to 5b,
-- when the embedding provider (and therefore the dimension) is chosen.
create extension if not exists vector;

-- ── Legal sources ──────────────────────────────────────────
-- One row per primary-law document (a rule or a statute section).
create table if not exists legal_sources (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,          -- "Federal Rules of Civil Procedure, Rule 12"
  citation      text        not null,          -- "Fed. R. Civ. P. 12"
  url           text        not null,          -- canonical primary-source URL
  jurisdiction  text        not null,          -- 'federal' (state codes later)
  source_type   text        not null check (source_type in ('rule', 'statute')),
  case_types    text[]      not null default '{}',  -- which app case types this maps to
  created_at    timestamptz not null default now(),
  unique (citation)
);

-- ── Legal chunks ───────────────────────────────────────────
-- Retrieval unit. `content` is app-authored plain-English explanation of the
-- provision (NOT a verbatim quote); `url` on the parent source points to the
-- authoritative text. Phase 7's verification gate confirms against that URL.
create table if not exists legal_chunks (
  id           uuid        primary key default gen_random_uuid(),
  source_id    uuid        not null references legal_sources on delete cascade,
  heading      text        not null,           -- "Rule 12(b)(6)"
  content      text        not null,           -- plain-English explanation
  content_fts  tsvector    generated always as (
                 to_tsvector('english', coalesce(heading, '') || ' ' || coalesce(content, ''))
               ) stored,
  created_at   timestamptz not null default now()
);

create index if not exists legal_chunks_fts_idx  on legal_chunks using gin (content_fts);
create index if not exists legal_chunks_source_idx on legal_chunks (source_id);

-- ── RLS: shared read, service-role-only write ──────────────
alter table legal_sources enable row level security;
alter table legal_chunks  enable row level security;

drop policy if exists "legal_sources: authenticated read" on legal_sources;
create policy "legal_sources: authenticated read"
  on legal_sources for select
  to authenticated
  using (true);

drop policy if exists "legal_chunks: authenticated read" on legal_chunks;
create policy "legal_chunks: authenticated read"
  on legal_chunks for select
  to authenticated
  using (true);
