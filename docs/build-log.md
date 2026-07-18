# ProSe Navigator Web — Build Log

Running record of architectural decisions. Newest entries at the bottom.

## 2026-07-18 — Day 1: Alignment

- Read all three provided specs in full (Cold-Start Workflow v1.0, Internal
  Engineering Audit v1.0, Strategic Case Analysis Fields v. Chase).
- **Missing spec:** Workflow Blueprint v1.0 (reactive workflow) was not
  provided. Owner decision: derive it and confirm. Result:
  `docs/derived-reactive-blueprint.md` — **pending approval**; the reactive
  FSM will not be built from it until approved. Shared layers and the
  cold-start workflow proceed in the meantime.
- **Repo placement:** owner chose a new workspace package in this monorepo
  (`artifacts/navigator-web`), sharing the existing Supabase project and
  reusing the existing two-source citation verifier
  (`artifacts/api-server/src/lib/{courtlistener,verification}.ts`) as the
  starting point for Layer 2.
- **E2E philosophy:** owner chose mechanics-only assertions for the Chase
  fact-pattern E2E — the test proves phases gate correctly, artifacts are
  produced, verification runs, and guardrails fire; it does not hard-code
  legal conclusions. The viability engine must compute honestly from data.
- **Auth:** Supabase Auth (already wired in this project), not Clerk.
- **Model layer:** Anthropic API. Drafting/reasoning on the strongest
  available model; classification tasks on Haiku; verification is
  deterministic API lookups + text matching — no reasoning model in the
  verification loop, per the master prompt.

## 2026-07-18 — Day 2: Scaffold

- Created `artifacts/navigator-web`: Next.js (App Router) + TypeScript +
  Tailwind v4. shadcn/ui components will be vendored in as they are needed
  (they are copy-in files; no runtime dependency on the generator).
- `schema.sql` at the package root defines the ten spec entities (Case, User
  profile, Party, EvidenceItem, LegalTheory, Filing, Deadline, Citation,
  TonePreference, Guardrail) plus the structural tables the handoff table
  (Cold-Start §15) requires: `case_phase_state` (FSM position + gate
  artifacts), `case_events` (timeline), `assets` (generated documents +
  verification reports), `memory_events` (corrections and durable facts).
  All tables carry `user_id` + RLS policies (`auth.uid()`).
- Deadlines store `due_date` and `safety_date` as separate columns;
  `safety_date` is computed at write time (20% of the interval earlier) and
  is the only date the UI surfaces in reminders (guardrail #6).
- Citations table doubles as the Authority Bank: a citation row is immutable
  once `verified_at` is set; re-verification inserts a new row version.
