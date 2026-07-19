# TODO — ProSe Navigator build backlog

Ordered, feature-by-feature. The loop always works the **first unchecked item**.
Complete one, pass the contract, commit, write `TASK-RESULT.md`, then the next.

Each item is scoped to be finishable in one task. When a task uncovers more
work, add a new unchecked item rather than expanding the current one.

## Foundation

- [x] **Env documentation** — Add `.env.example` at the repo root listing every
  variable each runtime reads (api-server, mobile, web), grouped by service,
  each with a one-line purpose and whether it's required. No code change; the
  gate is typecheck + tests staying green.
- [ ] **Production auth guard** — In `artifacts/api-server`, log a loud startup
  warning when `NODE_ENV=production` but `AI_REQUIRE_AUTH` / `RETRIEVAL_REQUIRE_AUTH`
  are not `"true"` (paid endpoints would be open). Warning only — never change
  behavior silently. No secrets in logs.

## Core legal engine

- [ ] **Viability engine (Phase 4)** — In `artifacts/navigator-web/lib`, add a
  deterministic viability computation: per candidate claim, evaluate
  statute-of-limitations window, standing, jurisdiction (federal question /
  diversity / state), damages vs. small-claims cap, and pre-suit/exhaustion
  requirement → `pass | hold | no_go` with a reason. Pure, injectable
  "today" clock, fully unit-tested. Feeds the existing `viabilityReport` the
  cold-start FSM already gates on. Never an LLM for the math.
- [ ] **docx export through the gate** — Generate a real `.docx` for a drafted
  artifact (server-side or a shared lib), routed so it is only producible when
  `runExportGate` passes, with the verification report attached as `nav_assets.
  verification_report`. Web downloads the file; the gate result is surfaced.
- [ ] **Auto-route confirm chip** — When the general chat detects a specific
  matter (e.g. "credit dispute"), offer a one-tap suggest-and-confirm chip into
  that workflow rather than silently switching. Suggestion logic tested; the
  user always confirms.

## Evidence & reactive surface

- [ ] **Evidence inventory (Phase 2)** — Wire the evidence uploader so Phase 2
  is more than a count: upload → classify (type/date/parties/amount) → indexed
  table with stable item codes; flag story-implied-but-unproduced items. OCR is
  a follow-up item, not required here.
- [ ] **Reactive docket + deadline surface** — Build the reactive workflow's
  Docket Ledger and Deadline Engine views over the existing schema
  (filings/deadlines), with the safety-margin date as the only reminder date.

## Cross-surface & quality

- [ ] **Web app identity parity** — Bring `artifacts/navigator-web` to the
  ivory + teal identity so the website and the mobile app read as one product
  (tokens, type, the session-input and activity-trace patterns).
- [ ] **api-server test harness** — Add a supertest-based suite for the API
  routes (validation, 401/429/503 paths, auth toggle) so future api-server work
  has a real gate. Add the `test` script to its package.json.

## Deferred / needs owner confirmation

- [ ] **Retire legacy `(tabs)` routes** — The old tab screens are unreachable
  from the new IA. Deleting them is a product decision (they are the rollback
  path). Do NOT action without an explicit "yes" from the owner.
