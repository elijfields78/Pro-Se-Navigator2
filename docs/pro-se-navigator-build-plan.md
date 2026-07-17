# Pro Se Navigator — Build Plan

Companion to `pro-se-navigator-audit.md`. Ranked by legal-safety risk,
security risk, user impact, technical dependency, and effort.

## Phase mapping (one canonical view)

The repo's original 15-phase roadmap (`replit.md`) and the master execution
prompt's Phases 1–6 describe the same product. Mapping:

| Master prompt | replit.md phases | Status |
|---|---|---|
| 1 Audit & stabilize | — | audit done; stabilization in progress |
| 2 Unified case workspace | (UX consolidation of 4) | not started |
| 3 Agent planning & trace | 9 (multi-agent groundwork) | not started |
| 4 Citation verification | 7 (verification gate) | not started |
| 5 Documents & drafts | part of 6 + new Documents pillar | not started |
| 6 Hybrid retrieval | 5b | scaffold ready (pgvector enabled) |
| (prereq for 3/4/5) model router | 6 | **blocked on provider API key** |

Later: 10 compliance, 11–13 case-type workflows, 14 Stripe, 15 legal framing.

## Ranked work queue

### P0 — Stabilize (safe, no product-behavior change)
1. ✅ **Deadline-engine unit tests** (`tests/rule6.test.ts`,
   `tests/deadlineRules.test.ts`; `pnpm --filter @workspace/pro-se-navigator test`).
   Highest-risk deterministic logic; spec mandates tests. No runtime deps
   added (node:test + tsx).
2. **Fix rollback gaps** in `CasesContext` (`deleteCase`, `updateCaseTitle`,
   `addDeadline`, `addSource`, `deleteArtifact`) to match the
   optimistic-write-with-rollback pattern used elsewhere.
3. **Quiet the mockup-sandbox typecheck failure** (fix dual @types/react or
   exclude package from root typecheck) so CI signal is trustworthy.

### P1 — Security hardening of api-server (before any public exposure)
4. Supabase JWT auth middleware on `/api/retrieval/search`; restrict CORS;
   add basic rate limiting; structured 401/429 responses.

### P2 — Documents pillar (biggest dead-UI gap; no AI needed)
5. `documents` table + Supabase Storage bucket + RLS (owner-only, size/type
   validation) — migration 004.
6. Wire `AttachmentSheet` to real upload; document list in case workspace;
   case association; delete with confirmation.

### P3 — Retrieval into the product (no AI needed)
7. Formalize retrieval contract in `lib/api-spec` → regenerate api-zod/client.
8. Research surface in the app: search the corpus from the case context,
   render results with citation + Cornell URL + tier badge; save selected
   authorities to `verified_authorities` as `pending`.

### P4 — Model router (BLOCKER: needs user-provided provider key)
9. Server-side `/api/ai/*` routes; provider abstraction; per-user usage
   metering (replaces placeholder `usage.tsx` figures); never callable
   direct-from-client. Unlocks: real post-intake chat, draft generation,
   document extraction.

### P5 — Verification gate + citations (master Phase 4)
10. Citation records tied to retrieved chunks; "Verified" only when the strict
    conditions hold; conflicting-source handling; URL resolution checks.

### P6 — Agent planning/trace/task-state (master Phase 3), then case
    workspace consolidation (master Phase 2 UX), then hybrid retrieval 5b
    (embedding provider chosen alongside Phase 6 key).

## Standing rules (from master spec, enforced throughout)

- Deadline math stays deterministic — AI may only *extract* candidate
  dates/rules for user confirmation.
- No provider keys in the mobile client; all model calls server-side.
- "Verified" label = strict technical meaning only.
- Approval gates before consequential/external actions; action-specific.
- Each phase: implement → test → document → report before the next.
