-- ============================================================
-- Pro Se Navigator — initial schema
-- Run this in your Supabase SQL Editor (project → SQL Editor → New query)
-- ============================================================

-- ── Cases ──────────────────────────────────────────────────
create table if not exists cases (
  id                 text        primary key,
  user_id            uuid        references auth.users on delete cascade not null,
  title              text        not null default '',
  case_type          text        not null,
  court              text,
  judge              text,
  case_number        text,
  service_date       text,
  intake_turn_index  integer     not null default 0,
  pending_follow_up  jsonb,
  last_message_at    timestamptz,
  created_at         timestamptz not null default now()
);

alter table cases enable row level security;

-- Cases: owner-only CRUD (all operations, enforced both read and write)
create policy "cases: owner full access"
  on cases for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Messages ───────────────────────────────────────────────
create table if not exists messages (
  id          text        primary key,
  case_id     text        references cases on delete cascade not null,
  user_id     uuid        references auth.users on delete cascade not null,
  role        text        not null check (role in ('navigator', 'user')),
  content     text        not null,
  next_steps  jsonb,
  created_at  timestamptz not null default now()
);

alter table messages enable row level security;

-- Messages: user_id must match AND the referenced case must belong to the same user.
-- The EXISTS subquery is itself subject to cases' RLS, preventing cross-tenant linkage.
create policy "messages: owner full access"
  on messages for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = messages.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = messages.case_id
        and cases.user_id = auth.uid()
    )
  );

-- ── Deadlines ──────────────────────────────────────────────
create table if not exists deadlines (
  id           text        primary key,
  case_id      text        references cases on delete cascade not null,
  user_id      uuid        references auth.users on delete cascade not null,
  case_title   text        not null default '',
  description  text        not null,
  due_date     text        not null,
  rule_basis   text        not null,
  source       text,
  created_at   timestamptz not null default now()
);

alter table deadlines enable row level security;

create policy "deadlines: owner full access"
  on deadlines for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = deadlines.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = deadlines.case_id
        and cases.user_id = auth.uid()
    )
  );

-- ── Verified authorities (sources) ─────────────────────────
create table if not exists verified_authorities (
  id               text        primary key,
  case_id          text        references cases on delete cascade not null,
  user_id          uuid        references auth.users on delete cascade not null,
  case_title       text        not null default '',
  citation         text        not null,
  verified_status  text        not null check (verified_status in ('verified', 'pending', 'failed')),
  url              text,
  quote            text,
  created_at       timestamptz not null default now()
);

alter table verified_authorities enable row level security;

create policy "verified_authorities: owner full access"
  on verified_authorities for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = verified_authorities.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = verified_authorities.case_id
        and cases.user_id = auth.uid()
    )
  );

-- ── Artifacts (documents) ──────────────────────────────────
create table if not exists artifacts (
  id          text        primary key,
  case_id     text        references cases on delete cascade not null,
  user_id     uuid        references auth.users on delete cascade not null,
  case_title  text        not null default '',
  title       text        not null,
  content     text        not null default '',
  kind        text        not null check (kind in ('motion', 'letter', 'form', 'note', 'other')),
  created_at  timestamptz not null default now()
);

alter table artifacts enable row level security;

create policy "artifacts: owner full access"
  on artifacts for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = artifacts.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = artifacts.case_id
        and cases.user_id = auth.uid()
    )
  );

-- ============================================================
-- Sign in with Apple setup note
-- ============================================================
-- To enable Sign in with Apple:
-- 1. Go to Supabase Dashboard → Authentication → Providers → Apple
-- 2. Enable the provider and add your Apple Service ID and secret key
-- 3. Add your bundle ID to the redirect URLs
-- See: https://supabase.com/docs/guides/auth/social-login/auth-apple
-- ============================================================
