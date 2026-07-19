# TASK-RESULT

_Regenerated after each completed task. Latest task at the top._

## ✅ Env documentation

**Task:** Add `.env.example` at the repo root listing every variable each
runtime reads (api-server, mobile, web), grouped by service, each with a
one-line purpose and required/optional marker.

**Branch:** `claude/contacts-visibility-mcq7yv`

**Files changed**
- `.env.example` (new) — 25 variables across three runtimes, grouped by
  service, with a secrets-safety header and the [required]/[optional] legend.
- `TODO.md` — item checked off.
- Loop scaffolding created this session: `PROJECT.md`, `CONTRACT.md`, `TODO.md`,
  `.claude/commands/do-task.md`, `.claude/commands/todo-all.md`.

**What was done**
Enumerated every `process.env.*` read across `artifacts/api-server`,
`artifacts/pro-se-navigator`, and `artifacts/navigator-web` and documented each
with its purpose and whether it's required. Encoded the DB connection-string
priority (pooler → DATABASE_URL → legacy password), the production security
posture (`AI_REQUIRE_AUTH` / `RETRIEVAL_REQUIRE_AUTH` → `true`), and the
secrets-never-in-client rule (no secret behind `EXPO_PUBLIC_` / `NEXT_PUBLIC_`).

**Gate results**
- Typecheck (`pnpm run typecheck`): **pass** (all packages)
- Tests: **pass** — pro-se-navigator 21/21, navigator-web 34/34 (55 total)
- Build gate: not applicable — task touched no `artifacts/navigator-web` code.

**Follow-ups discovered**
- `SUPABASE_SERVICE_ROLE_KEY` is documented but not yet read by code; wire it
  when web Storage/admin actions land (already noted in the web app README).

**Next unchecked item:** _Production auth guard_ — loud startup warning in
api-server when production runs with the auth flags off.
