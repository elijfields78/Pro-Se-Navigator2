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

## 2026-07-18 — Day 3: Verification service (Layer 2)

- `lib/verification/` in navigator-web. Ported and hardened the v1 two-source
  verifier: CourtListener citation-lookup is the extractor + primary verifier
  for case citations; Perplexity (strict verdict format, budgeted to 5 calls
  per document) is an independent secondary check for cases the primary
  source can't confirm. Both adapters take an injectable `fetch`; response
  mapping and verdict parsing are pure functions with unit tests.
- Statutes / rules / regulations are extracted locally (U.S.C., C.F.R.,
  Fed. R. Civ. P., La. R.S., La. Civ. Code — conservative patterns). No free
  primary-source API is wired for them yet, so per the master prompt they
  return `needs_user_confirmation`, which **blocks export** until the user
  explicitly confirms against source text; confirmations are recorded
  (who/when) in the verification report. eCFR / govinfo adapters are the
  designated upgrade path.
- `verificationGate()` is the hard gate: pass only when every citation is
  `verified`, `corroborated`, or user-confirmed. `ambiguous`, `not_found`,
  and `error` always block. Zero-citation documents pass trivially.
- `buildVerificationReport()` produces the per-export report (totals, per-
  citation entries, user-confirmation stamps, exportable flag) — stored in
  `nav_assets.verification_report`.
- No reasoning model anywhere in the loop: lookups, regex extraction, and a
  strict-format verdict parser only.
- Tests: 8 passing (extraction incl. trailing-period bug fix, CourtListener
  row mapping, verdict parsing, orchestrator merge/corroboration/honest
  failure, gate semantics, report assembly).
