# CONTRACT — definition of done

Every task in the autonomous build loop must satisfy this contract before it is
marked complete and committed. No exceptions. If a gate fails, fix it or revert
the task's changes — a task is "done" only when the repo is at least as healthy
as when the task started.

## Gates (run in this order, all must pass)

The exact commands for this monorepo. Run from the repo root.

1. **Typecheck** (the compile + type gate for every package):
   ```
   pnpm run typecheck
   ```
2. **Format check** (soft gate — advisory; no ESLint is configured, prettier
   has no repo style file, so this only flags egregious drift):
   ```
   pnpm exec prettier --check "artifacts/**/*.{ts,tsx}" "lib/**/*.ts" 2>/dev/null || echo "format: advisory only"
   ```
3. **Tests** (both suites must be green; add tests for any new logic):
   ```
   pnpm --filter @workspace/pro-se-navigator run test
   pnpm --filter @workspace/navigator-web run test
   ```
   Baseline at loop start: **21** mobile + **34** web = 55 passing. A task may
   only raise this number, never lower it. `api-server` has no suite yet;
   changes there stay surgical until the harness task lands.
4. **Build** (the web app's production build must compile; run only when the
   task touches `artifacts/navigator-web`):
   ```
   pnpm --filter @workspace/navigator-web run build
   ```
   When a task touches the API server, also: `pnpm --filter @workspace/api-server run build`.
   Mobile bundling is not part of the per-task gate (Expo export is slow and
   needs native tooling); typecheck covers it.

## Rules

- **One task at a time.** Work only the first unchecked item in `TODO.md`.
  Do not pull in adjacent work — file a new TODO item instead.
- **Branch, never main.** All work happens on the dedicated feature branch
  `claude/contacts-visibility-mcq7yv` (or a `autobuild/<task-slug>` branch cut
  from it). Never commit or push to `main`.
- **Commit only on a full pass.** One commit per task, message
  `task: <short description>` plus the standard trailers. Push after commit.
- **Never break working functionality.** If something that passed before now
  fails, fix it before proceeding or revert the change.
- **No new dependencies or whole-module rewrites** unless the change is clearly
  safe and covered by tests. Prefer targeted, verifiable diffs.
- **Do not touch the engine's meaning.** Verification, guardrails, deadline
  math, workflow gates, and the data model may be extended but not weakened.
  A guardrail that stops blocking, or a citation that ships unverified, is a
  contract failure regardless of green gates.
- **Secrets stay server-side.** No provider keys in any client bundle; nothing
  prefixed `EXPO_PUBLIC_` / `NEXT_PUBLIC_` may hold a secret.

## After each task

Write `TASK-RESULT.md` (overwrite) with: the task, files changed, what was
done, the gate results, and any follow-ups discovered. Check the item off in
`TODO.md`.

## Blockers

If a task fails its gates **3 times**, stop. Do not force a risky fix. Leave the
item unchecked, write the blocker clearly in `TASK-RESULT.md` (what was tried,
the exact failure, the suspected cause, options), and report to the user.
