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

## 2026-07-18 — Full build-out (owner-directed: "execute everything now")

- **Layer 3 (memory):** `lib/memory` — MemoryStore interface with an
  in-memory implementation (tests/E2E) and a Supabase implementation over
  the nav_* tables. Caption/signature mutable only through explicit setters;
  every set is also recorded as a memory event.
- **Meta-loop primitive:** `lib/metaloop` — async generator streaming step
  states through Intake → Clarify → Verify → Outline → Draft → Pressure-Test
  → Memory-Update. Clarify questions halt (`blocked_on_user`), verify
  failure hard-stops, outline halts `awaiting_approval` with resume support
  (completed outcomes carry over, nothing re-runs).
- **Layer 4 (subagents):** `lib/subagents` — orchestrator with spawn /
  wait / waitAll, parallel by default, per-job isolation; eight types with
  per-type model routing (Haiku for memory/past_context, strongest model
  elsewhere) and distilled-summary contracts. Runner injectable.
- **Layer 5 (guardrails):** `lib/guardrails` — seven checks composed into
  `runExportGate`. Blocking: caption lock, signature lock, verification
  gate, banned vocabulary (counsel pejoratives + sovereign-citizen terms,
  word-boundary matched). Advisory: tone filter (with mechanical fix),
  factual consistency (assertion→evidence/docket refs). Automatic: deadline
  safety margin — `computeSafetyDate` = 20% of the created→due interval,
  minimum one full day for day-scale intervals.
- **Layer 6 (workflows):** `lib/workflows` — generic gated `WorkflowMachine`
  (advance refuses while gate artifacts are missing; fastForward for
  already-covered phases). Cold-start machine: all nine phases with the §2
  gates, including the §14.4 commitment gate before drafting and HOLD-blocks
  in viability. `buildReactiveHandoff` enforces the §15 nothing-lost
  handoff. Phase 1 Story Intake: silent extraction (zod-validated, resilient
  to malformed model output), neutral narrative, and the five §3.2
  gap-filler questions asked only when missing. Reactive: 14-module registry
  + deterministic inbound-filing router with chip suggestions (per the
  derived Blueprint — still subject to correction against the real v1.0).
- **Layer 7 (chat surface):** `/app` — streaming chat with NAVIGATOR label,
  phase chips, busy status, case sidebar, amber send; `/api/chat` streams
  Anthropic responses (strongest available model) with a plain-English,
  honesty-first system prompt.
- **E2E (mechanics-only):** the Chase §16 pattern walks all nine phases —
  every gate refuses early advancement, HOLD viability blocks, the
  commitment gate blocks, the export gate blocks banned vocabulary and
  unconfirmed citations then passes a clean verified draft, and the reactive
  handoff carries narrative/evidence/theories/viability/court/docket.
- 28 tests passing; typecheck and production build clean.

## 2026-07-18 — Wiring pass: engines ↔ surface, auth, persistence

- **Auth:** Supabase email/password on the web surface; the browser session's
  access token rides as a Bearer header to API routes, which validate it and
  run every query through a token-scoped client — RLS enforces per-user
  isolation on all case data. No service-role key in user paths.
- **API routes:** `/api/cases` (create/list), `/api/cases/[id]` (bundle +
  current-gate missing list), `/api/cases/[id]/intake` (Phase 1 pipeline),
  `/api/cases/[id]/approve-narrative` (the Phase 1 gate action),
  `/api/cases/[id]/advance` (generic server-side advance attempt).
- **The FSM never trusts the client:** `computeArtifacts` (pure, tested)
  assembles gate inputs from stored rows only; `tryAdvance` rebuilds the
  machine from the persisted phase and evaluates the real gate. A client
  cannot leapfrog phases by posting artifact claims.
- **Phase-5+ artifacts** (pre-suit, commitment, packet, service) live in
  `nav_case_phase_state.gate_artifacts` until their own modules exist; the
  gates already enforce them.
- **Surface:** `/app` now signs in, creates the case on the first story
  message, runs real Phase 1 in the conversation (structure → gap-filler
  questions → iterative retelling → explicit approval chip), advances the
  FSM on approval, and shows live phase + missing-gate items + evidence
  count in the sidebar. Post-intake messages flow to the general Navigator
  chat with case context prepended.
- 32 tests passing; typecheck and production build clean.
