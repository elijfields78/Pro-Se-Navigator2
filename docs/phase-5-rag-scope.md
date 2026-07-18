# Phase 5 — RAG (Retrieval) Scope

Status: **scoping complete, implementation not started**
Prereq for: Phase 6 (model router) and Phase 7 (verification gate — never paywalled).

## Goal

Ground the app's core promise — *"verifies every legal citation against a real
primary source before it reaches a document"* — with a real, searchable corpus of
primary law. Phase 5 builds retrieval only; it makes **no LLM generation calls**.
It produces cited passages that later phases consume.

## Decisions (locked)

- **Store:** Supabase `pgvector` — one system alongside existing case data, no new
  service or bill.
- **v1 corpus:** Federal rules (FRCP, FRAP, FRE) + FCRA statute (15 U.S.C. §1681…).
  All public-domain, authoritative, finite, and matched to the existing case types
  (general / fcra / traffic / ifp) and the Rule 6 deadline logic already shipped.

## Two-step rollout (respects the "API keys arrive at Phase 6" rule)

### Phase 5a — retrieval scaffold, zero API keys
- `pgvector` extension enabled; `legal_sources` + `legal_chunks` tables created.
- Ingestion pipeline: fetch/parse source docs → chunk → store with metadata
  (title, citation, canonical URL, jurisdiction, source_type, hierarchy path).
- Baseline retrieval via **Postgres full-text search** (`tsvector`/`ts_rank`) —
  works immediately, no external dependency.
- New Express route on `api-server`: `POST /api/retrieval/search`
  → `{ query, caseType?, limit? }` returns ranked `{ citation, url, excerpt, score }`.
- Seed the federal-rules + FCRA corpus.

### Phase 5b — semantic layer (once an embedding provider + key is chosen)
- Add embedding column to `legal_chunks`; backfill embeddings for the corpus.
- Hybrid retrieval: full-text + vector similarity, reciprocal-rank fused.
- Embedding provider decision deferred to when Phase 6 keys are provisioned
  (candidates: Voyage AI — pairs with Anthropic; OpenAI text-embedding-3; Cohere).

## Data model (draft)

```
legal_sources
  id            uuid pk
  title         text            -- "Federal Rules of Civil Procedure, Rule 12"
  citation      text            -- "Fed. R. Civ. P. 12"
  url           text            -- canonical primary-source URL
  jurisdiction  text            -- 'federal' | state code
  source_type   text            -- 'rule' | 'statute'
  created_at    timestamptz

legal_chunks
  id            uuid pk
  source_id     uuid fk -> legal_sources
  heading       text            -- e.g. "12(b)(6)"
  content       text            -- chunk text
  fts           tsvector        -- generated, GIN-indexed (5a)
  embedding     vector(N)       -- added in 5b
  created_at    timestamptz
```

RLS note: the corpus is **shared public reference data**, not per-user — read-only
to all authenticated users, writable only by the ingestion service role. This is a
deliberate exception to the per-user RLS pattern used by cases/messages/etc.

## What Phase 5 explicitly does NOT do

- No answer generation / summarization (that's Phase 6).
- No live-verification gate (that's Phase 7 — but Phase 5's resolvable URLs are
  what makes that gate possible).
- No deadline math (already shipped in Phase 8; deterministic, never LLM).

## Open items to revisit at Phase 5b / 6

- Embedding provider + key.
- Whether to supplement the stored corpus with live CourtListener/Justia lookups
  for case law (statutes/rules are stable; case law is not).
