# Pro Se Navigator — Repository & Application Audit

Date: 2026-07-17 · Branch: `claude/contacts-visibility-mcq7yv` (PR #1) · Auditor: Claude (session work)

This audit reflects direct inspection of the repository plus live verification
performed against the deployed Replit/Supabase environment earlier in this
session (auth E2E test, corpus row counts, retrieval endpoint queries).

---

## 1. Repository layout

```
artifacts/pro-se-navigator/   Expo (React Native) mobile app — the product
artifacts/api-server/         Express 5 API server (health + retrieval)
artifacts/mockup-sandbox/     Design mockups (Vite/React web) — not the product
lib/db/                       Drizzle + pg pool (DATABASE_URL); corpus schema
lib/api-spec/                 OpenAPI spec (only /healthz so far)
lib/api-zod/                  Orval-generated zod contracts (health only)
lib/api-client-react/         Generated client (health only)
scripts/                      tsx CLI scripts (legal-corpus ingestion)
docs/                         phase-5-rag-scope.md, this audit, build plan
```

Stack: Expo Router (file-based), TypeScript strict, Supabase (Auth + Postgres
+ RLS), React Query available, pnpm workspaces (catalog versions), Node 24 on
Replit. Deployment: Replit runs the live app; GitHub is source of truth;
this session pushes to the PR branch and Replit pulls it.

## 2. What is implemented and verified working

| Area | Evidence |
|---|---|
| Supabase auth (email/password + Apple w/ nonce) | `contexts/AuthContext.tsx`; live E2E signup/signin passed this session |
| Per-user data: cases, messages, deadlines, verified_authorities, artifacts | `migrations/001_initial.sql`; RLS `auth.uid() = user_id` + child-table EXISTS checks; live RLS isolation test passed (other user → 0 rows) |
| Guided intake state machine (4 case types, 4 turns each) | `data/intakeScripts.ts`, `contexts/CasesContext.tsx` (`intakeTurnIndex`, follow-ups, wrap-up, post-intake) |
| Deterministic Rule 6(a) deadline engine | `lib/rule6.ts` (trigger-day exclusion, weekend/holiday roll-forward, federal holiday table incl. observed shifts); `lib/deadlineRules.ts` keyword lookup. **No LLM involvement — correct per spec** |
| Deadline chat flow | artifact → estimate message → `DeadlineDateEntry` widget → deterministic compute → deadline card + confirmation with rule basis and local-rules warning |
| Legal corpus + retrieval (Phase 5a) | `migrations/002/003`; 15 sources / 20 chunks live in Supabase (verified counts); `POST /api/retrieval/search` FTS returns Fed. R. Civ. P. 12 and 15 U.S.C. § 1681i for test queries (verified live) |
| Optimistic writes with rollback | `CasesContext` sendMessage/addArtifact/submitDeadlineTriggerDate roll back state on DB failure |
| Screens | (auth) login/register; tabs index/cases/chat/deadlines/artifacts/sources; case/[id], case/new, settings, usage, artifacts-archive |

## 3. Partially implemented

- **Attachments**: `AttachmentSheet` picks images/camera/documents but nothing
  is uploaded or persisted — no Supabase Storage integration, no documents
  table. Picked files effectively vanish. (Spec pillar "Documents" is UI-only.)
- **Sources tab**: renders `verified_authorities`, but nothing populates that
  table in real flows — no verification pipeline exists yet (Phase 7).
- **Draft generation**: `create_draft` action writes a literal placeholder
  string ("Full AI generation arrives in Phase 6").
- **API contracts**: retrieval request/response schemas live only in
  `api-server/src/routes/retrieval.ts`; not yet in `lib/api-spec` → generated
  `api-zod` / `api-client-react` are health-only. The mobile app does not call
  the retrieval endpoint at all yet.
- **replit.md** now matches reality (fixed this session) but docs and the two
  spec phase-numbering systems (15-phase roadmap vs. master-prompt Phases 1–6)
  need one canonical mapping (see build plan).

## 4. Mocked / simulated (must not be mistaken for real)

- `hooks/usePlan.ts`: tier hardcoded `'free'`, `uploadsUsedToday: 0`.
- `app/usage.tsx`: "Placeholder usage figures — Phase 6/14 will wire real counters."
- Post-intake chat: canned `POST_INTAKE_RESPONSE` — **no AI model is connected
  anywhere in the product** (by design until Phase 6/model router).
- Drafts: placeholder content (above).

## 5. Broken / defects found

- **No tests of any kind exist in the repo** — no runner, no test files. The
  deterministic deadline engine (the highest-risk pure logic in the app, and
  the one the spec singles out) is untested. → fixed as first stabilization
  item (see `artifacts/pro-se-navigator/tests/`).
- **`mockup-sandbox` typecheck fails** (pre-existing): dual `@types/react`
  resolution conflict in `calendar.tsx` / `spinner.tsx`. Not product code; does
  not affect the app. Should be fixed or the package excluded from the root
  typecheck to keep CI signal clean.
- `deleteCase` / `updateCaseTitle` / `addDeadline` / `addSource` /
  `deleteArtifact` fire Supabase writes without rollback on failure
  (inconsistent with the newer flows that do roll back).
- `genId()` (timestamp+random) is fine for local ids but ordering-sensitive
  logic uses `Date.now()+5/+10` offsets to sequence messages — fragile.

## 6. Legal-safety risks (ranked)

1. **No verification gate yet** (Phase 7): nothing currently prevents an
   unverified citation from reaching the user once AI lands. Mitigation today:
   no AI is connected; corpus chunks are app-authored explanations with
   canonical Cornell LII URLs — but chunk `content` is hand-written and
   **has no automated check against the source text**.
2. `deadlineRules.ts` keyword estimates could be mistaken for calculated
   deadlines; current UX does label them estimates and requires the trigger
   date — keep that framing.
3. Rule 6 engine handles federal holidays only — no state/local court
   holidays, no local-rule overrides; disclaimer exists in the confirmation
   message (good) but deadline cards should carry a "verify against local
   rules" state per spec.
4. Disclaimers exist in flows but there is no per-session "information, not
   legal advice" surface per the master spec (Phase F requirement, later).

## 7. Security / privacy risks

- RLS is solid on all five user tables (verified live) and corpus tables are
  authenticated-read/service-role-write. Good.
- `POST /api/retrieval/search` has **no authentication and no rate limiting**.
  Content is public reference law, so exposure is low, but it's an open
  compute/DB endpoint — add auth (Supabase JWT) + rate limit before exposing
  publicly.
- CORS is wide open (`app.use(cors())`).
- Secrets handling is correct: no keys in client code; `EXPO_PUBLIC_*` are the
  anon-key pair only. DB password/management token were pasted into chat this
  session — **user advised to rotate both** (repeat here for the record).
- No audit logging of sensitive actions yet (spec requires it at approval-gate
  time; nothing sensitive is automatable yet).

## 8. What should be built next (see build plan for ranking)

1. Tests for deterministic deadline logic (done with this audit).
2. Documents pipeline: Supabase Storage bucket + `documents` table + RLS +
   upload wiring in `AttachmentSheet` (turns dead UI into the spec's
   Documents pillar).
3. Retrieval → app integration: typed client + Sources/research UI using the
   live endpoint; add auth + rate limiting to the endpoint.
4. Phase 6 model router (needs provider key from user) — unlocks real chat,
   draft generation, document intelligence.
5. Phase 7 verification gate + citation records (spec's Verified standard).
6. Case workspace consolidation (master-spec Phase 2 UX).

## 9. Preserve / modify

- **Preserve**: intake state machine; Rule 6 engine; RLS schema + policies;
  Expo Router structure; design tokens (`constants/colors.ts`); optimistic
  write+rollback pattern; corpus schema and FTS retrieval; pnpm catalog setup.
- **Modify**: `AttachmentSheet` (wire real uploads), `usePlan`/`usage`
  (label as placeholder or wire), api-server (auth/rate-limit/CORS), api-spec
  (formalize retrieval contract), rollback gaps in `CasesContext`,
  mockup-sandbox typecheck noise.
- **Do not touch**: `lib/api-zod/src/generated/*` (orval-generated).
