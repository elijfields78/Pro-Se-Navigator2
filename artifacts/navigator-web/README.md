# ProSe Navigator (Web)

A web application that takes a pro se litigant from grievance to filed
complaint (cold-start workflow) and then manages the live case (reactive
workflow) — with citation verification as a hard export gate, a locked
caption/signature, tone and vocabulary guardrails, and safety-margin deadline
tracking.

Specs live in [`/docs`](../../docs): the Cold-Start Workflow, the Internal
Engineering Audit, and the derived reactive Blueprint (pending approval).
Architectural decisions are logged in [`/docs/build-log.md`](../../docs/build-log.md).

> This software does not provide legal advice and never files anything with a
> court. The user files; the app prepares and verifies.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (shared with the mobile app) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (RLS enforces per-user isolation) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Storage + admin operations from API routes. Never exposed to the client. |
| `ANTHROPIC_API_KEY` | yes | Drafting/reasoning (strongest available model) and classification (Haiku) |
| `COURTLISTENER_API_TOKEN` | yes | Citation verification — federal case law primary source |
| `PERPLEXITY_API_KEY` | optional | Second-source citation cross-check (two-source verification) |
| `PORT` | optional | Dev/prod server port (defaults to 3000) |

## First run

1. `pnpm install` (from the repo root — this is a pnpm workspace).
2. Create the database: open the Supabase SQL editor and run
   [`schema.sql`](./schema.sql). All tables are prefixed `nav_` and carry RLS.
3. Set the environment variables above (Repl Secrets in development).
4. `pnpm --filter @workspace/navigator-web run dev`
5. Open the printed URL. You should see the landing page.

## Scripts

- `dev` / `build` / `start` — Next.js lifecycle
- `typecheck` — `tsc --noEmit` (runs in the workspace-wide `pnpm typecheck`)
- `test` — node test runner over `tests/*.test.ts` (verification service,
  guardrails, caption lock, and the cold-start E2E land here as they're built)

## Build order (from the master prompt)

1. **Layer 1 — Data model** (`schema.sql`) ✅
2. **Layer 2 — Verification service** — next; ports the existing two-source
   verifier from `artifacts/api-server`
3. Layer 3 — Memory service
4. Layer 4 — Subagent orchestration
5. Layer 5 — Guardrails (seven checks, one export gate)
6. Layer 6 — Workflow engines (cold-start FSM first; reactive FSM after the
   derived Blueprint is approved)
7. Layer 7 — Chat surface
