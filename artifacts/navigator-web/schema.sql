-- ============================================================================
-- ProSe Navigator — Layer 1 Data Model
-- Postgres / Supabase. Run in the Supabase SQL editor (or psql).
--
-- The ten spec entities: profiles (User), cases (Case), parties (Party),
-- evidence_items (EvidenceItem), legal_theories (LegalTheory), filings
-- (Filing), deadlines (Deadline), citations (Citation), tone_preferences
-- (TonePreference), guardrails (Guardrail).
--
-- Plus the structural tables the Cold-Start §15 handoff requires:
-- case_phase_state (FSM position + gate artifacts), case_events (timeline),
-- assets (generated documents + verification reports), memory_events
-- (corrections & durable facts — every user correction is a memory event).
--
-- All user data carries user_id with RLS (auth.uid()). Nothing is readable
-- or writable across users.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── User profile ────────────────────────────────────────────────────────────
create table if not exists nav_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  home_state  text,          -- anchors venue/diversity analysis (asked, not inferred)
  home_city   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Case ────────────────────────────────────────────────────────────────────
create table if not exists nav_cases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  title              text not null default '',
  workflow           text not null default 'cold_start'
                     check (workflow in ('cold_start', 'reactive')),
  -- Canonical, guardrail-locked identity. Mutable only via explicit
  -- settings-level action — never via a chat turn (guardrails #1 and #2).
  canonical_caption  text,
  signature_block    text,
  -- Court profile (locked at Cold-Start Phase 6)
  court_name         text,
  court_division     text,
  docket_number      text,
  filing_method      text,   -- 'pacer' | 'state_portal' | 'paper' | 'in_person'
  filing_fee_cents   integer,
  jury_demand        boolean not null default false,
  -- Phase-1 artifact
  fact_narrative     text,
  fact_narrative_approved boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── Party ───────────────────────────────────────────────────────────────────
create table if not exists nav_parties (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references nav_cases(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  role              text not null check (role in ('plaintiff', 'defendant', 'other')),
  name              text not null,
  entity_type       text,   -- 'individual' | 'corporation' | 'llc' | 'government' | ...
  address           text,
  citizenship_state text,   -- diversity math
  registered_agent  text,   -- service of process
  capacity          text,   -- e.g. 'Pro Se', 'individually', 'N.A.'
  created_at        timestamptz not null default now()
);

-- ── EvidenceItem ────────────────────────────────────────────────────────────
create table if not exists nav_evidence_items (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references nav_cases(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  item_code        text not null,   -- stable ID, e.g. 'EV-001'; exhibit list key
  title            text not null,
  item_type        text not null check (item_type in
                     ('contract','notice','statement','correspondence','receipt',
                      'screenshot','physical','testimony','audio_video','other')),
  item_date        date,
  parties_involved text,
  amount_cents     bigint,
  description      text,
  storage_path     text,            -- Supabase Storage; null for described-but-unproduced
  ocr_text         text,
  -- 'missing' items: the story implies them but no upload supports them
  is_missing       boolean not null default false,
  how_to_obtain    text,
  created_at       timestamptz not null default now(),
  unique (case_id, item_code)
);

-- ── LegalTheory ─────────────────────────────────────────────────────────────
create table if not exists nav_legal_theories (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references nav_cases(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  claim_name      text not null,          -- e.g. 'ECOA adverse-action notice'
  statute_ref     text,                   -- e.g. '15 U.S.C. § 1691(d)'
  plain_english   text,                   -- the menu line shown to the user
  elements        jsonb not null default '[]'::jsonb,
  selected        boolean not null default false,
  -- Viability (Phase 4): computed honestly from data, never scripted.
  viability       text not null default 'untested'
                  check (viability in ('untested','pass','hold','no_go')),
  viability_notes text,
  sol_deadline    date,                   -- statute-of-limitations edge
  created_at      timestamptz not null default now()
);

-- ── Filing ──────────────────────────────────────────────────────────────────
create table if not exists nav_filings (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references nav_cases(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  ecf_number   text,
  title        text not null,
  filing_type  text,   -- 'complaint' | 'motion' | 'opposition' | 'order' | 'notice' | ...
  filed_by     text not null default 'user' check (filed_by in ('user','opponent','court')),
  filed_date   date,
  status       text not null default 'draft' check (status in
                 ('draft','filed','pending','briefed','ruled','mooted','stricken')),
  storage_path text,
  summary      text,
  created_at   timestamptz not null default now()
);

-- ── Deadline ────────────────────────────────────────────────────────────────
-- Guardrail #6: stored twice. safety_date is 20% of the interval earlier and
-- is the ONLY date UI reminders surface (actual date shown alongside, labeled).
create table if not exists nav_deadlines (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references nav_cases(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  due_date    date not null,
  safety_date date not null,
  rule_basis  text,    -- e.g. 'FRCP 12(a)', 'LR 7(f)'
  filing_id   uuid references nav_filings(id) on delete set null,
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  check (safety_date <= due_date)
);

-- ── Citation (the Authority Bank) ───────────────────────────────────────────
-- A row is immutable once verified_at is set; re-verification inserts a new
-- version. Guardrail #3 consults this table: every citation in an export must
-- resolve to a row with verified_status = 'verified'.
create table if not exists nav_citations (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references nav_cases(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  cite_text       text not null,   -- 'Wieburg v. GTE Sw., 272 F.3d 302 (5th Cir. 2001)'
  cite_type       text not null check (cite_type in ('case','statute','rule','regulation')),
  proposition     text,            -- what the draft uses it FOR (holding match check)
  source_url      text,
  quote           text,            -- the matched primary-source text
  verified_status text not null default 'pending'
                  check (verified_status in ('pending','verified','failed','unverifiable')),
  checked_against text,            -- 'courtlistener' | 'ecfr' | 'manual' | ...
  verified_at     timestamptz,
  version         integer not null default 1,
  created_at      timestamptz not null default now()
);

-- ── TonePreference ──────────────────────────────────────────────────────────
create table if not exists nav_tone_preferences (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null unique references nav_cases(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- e.g. {"no_exclamations": true, "style": "measured", "prefer": [...]}
  profile      jsonb not null default '{}'::jsonb,
  -- case-specific additions to the global banned lists (never removals)
  banned_extra text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Guardrail ───────────────────────────────────────────────────────────────
-- Per-case guardrail config. The four hard gates (caption_lock, signature_lock,
-- verification_gate, banned_vocabulary) cannot be disabled — enforced in the
-- application export gate regardless of the enabled flag here.
create table if not exists nav_guardrails (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references nav_cases(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (name in
               ('caption_lock','signature_lock','verification_gate','tone_filter',
                'deadline_safety_margin','banned_vocabulary','factual_consistency')),
  enabled    boolean not null default true,
  config     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (case_id, name)
);

-- ── Structural: FSM position + gate artifacts ───────────────────────────────
create table if not exists nav_case_phase_state (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null unique references nav_cases(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  workflow       text not null check (workflow in ('cold_start','reactive')),
  phase          text not null,   -- e.g. 'story_intake', 'evidence_inventory', ...
  -- Which gate artifacts exist, e.g. {"fact_narrative": true, "viability_report": false}
  gate_artifacts jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- ── Structural: timeline ────────────────────────────────────────────────────
create table if not exists nav_case_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references nav_cases(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null,  -- 'filing' | 'service' | 'deadline' | 'draft' | 'call' | ...
  title       text not null,
  detail      text,
  occurred_at timestamptz not null default now(),
  ref_table   text,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

-- ── Structural: generated assets + verification reports ─────────────────────
create table if not exists nav_assets (
  id                  uuid primary key default gen_random_uuid(),
  case_id             uuid not null references nav_cases(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  kind                text not null check (kind in
                        ('complaint','motion','opposition','letter','notice','packet',
                         'verification_report','other')),
  format              text not null default 'docx' check (format in ('docx','pdf','md','json')),
  storage_path        text,
  -- The verification report generated alongside this export (guardrail #3)
  verification_report jsonb,
  -- Meta-loop trace: which steps ran, when, and their outcomes
  meta_loop_trace     jsonb,
  created_at          timestamptz not null default now()
);

-- ── Structural: memory events ───────────────────────────────────────────────
create table if not exists nav_memory_events (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references nav_cases(id) on delete cascade,  -- null = user-global
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('correction','durable_fact','preference')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table nav_profiles         enable row level security;
alter table nav_cases            enable row level security;
alter table nav_parties          enable row level security;
alter table nav_evidence_items   enable row level security;
alter table nav_legal_theories   enable row level security;
alter table nav_filings          enable row level security;
alter table nav_deadlines        enable row level security;
alter table nav_citations        enable row level security;
alter table nav_tone_preferences enable row level security;
alter table nav_guardrails       enable row level security;
alter table nav_case_phase_state enable row level security;
alter table nav_case_events      enable row level security;
alter table nav_assets           enable row level security;
alter table nav_memory_events    enable row level security;

create policy "own profile" on nav_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'nav_cases','nav_parties','nav_evidence_items','nav_legal_theories',
    'nav_filings','nav_deadlines','nav_citations','nav_tone_preferences',
    'nav_guardrails','nav_case_phase_state','nav_case_events','nav_assets',
    'nav_memory_events'
  ] loop
    execute format(
      'create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_nav_cases_user       on nav_cases(user_id);
create index if not exists idx_nav_parties_case     on nav_parties(case_id);
create index if not exists idx_nav_evidence_case    on nav_evidence_items(case_id);
create index if not exists idx_nav_theories_case    on nav_legal_theories(case_id);
create index if not exists idx_nav_filings_case     on nav_filings(case_id);
create index if not exists idx_nav_deadlines_case   on nav_deadlines(case_id, safety_date);
create index if not exists idx_nav_citations_case   on nav_citations(case_id, verified_status);
create index if not exists idx_nav_events_case      on nav_case_events(case_id, occurred_at);
create index if not exists idx_nav_assets_case      on nav_assets(case_id);
create index if not exists idx_nav_memory_user      on nav_memory_events(user_id, created_at);
