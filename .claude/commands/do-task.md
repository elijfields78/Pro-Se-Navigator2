---
description: Execute the first unchecked TODO.md item under the build contract
---

You are running one iteration of the ProSe Navigator autonomous build loop.

## Read first
- `CONTRACT.md` — the definition of done and the exact gate commands. Obey it.
- `TODO.md` — pick the **first unchecked `- [ ]` item**. That is your only task.
- `PROJECT.md` — repo structure and what the engine means (don't weaken it).

If the first unchecked item is under "Deferred / needs owner confirmation",
STOP and ask the owner instead of building it.

## Do exactly one task
1. Confirm you're on the dedicated branch (`claude/contacts-visibility-mcq7yv`
   or a `autobuild/<slug>` branch cut from it), never `main`.
2. Implement the task with the smallest correct diff. Add tests for any new
   logic. Do not pull in adjacent work — if you find more, add a new unchecked
   item to `TODO.md` rather than expanding scope.
3. Run the contract gates in order (typecheck → format(advisory) → both test
   suites → build when the task touched web/api). Paste the real results.
4. If a gate fails, fix it and re-run. **After 3 failed attempts, stop**: leave
   the item unchecked, and write the blocker (what you tried, exact failure,
   suspected cause, options) into `TASK-RESULT.md`. Report and end.

## On success
5. Check the item off in `TODO.md` (`- [x]`).
6. Overwrite `TASK-RESULT.md` with: the task, files changed, what you did, the
   gate results, and any follow-ups discovered.
7. Commit — one commit, message `task: <short description>` with the standard
   trailers — then push to the dedicated branch.
8. Report the one task done and what the next unchecked item is. Do NOT start
   the next task; that's a separate invocation.
