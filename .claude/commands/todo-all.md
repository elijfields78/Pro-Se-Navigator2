---
description: Run the build loop across TODO.md, one task at a time, until done or blocked
---

You are running the ProSe Navigator autonomous build loop to completion.

Repeat the `do-task` procedure (see `.claude/commands/do-task.md` and
`CONTRACT.md`) for successive unchecked items in `TODO.md`:

1. Do the **first unchecked item**, fully, under the contract — implement,
   gate, check off, write `TASK-RESULT.md`, commit, push.
2. Only after it fully passes and is committed, move to the next unchecked item.
   **Never build more than one task before its gates pass and it's committed** —
   feature by feature, not all at once.
3. Stop the loop when any of these happens, and report clearly:
   - `TODO.md` has no unchecked items left (done), or
   - the next unchecked item is under "Deferred / needs owner confirmation"
     (stop and ask), or
   - a task fails its gates 3 times (blocker — leave it unchecked, write the
     blocker into `TASK-RESULT.md`, and stop; do not skip ahead to a later
     item to dodge it), or
   - a task would require a new dependency, a schema change, or weakening the
     engine (verification/guardrails/deadline math/workflow gates) — pause and
     ask before proceeding.

Keep `TASK-RESULT.md` current after every task. Never touch `main`. Report a
short running tally as you go (task done, gates green, next up) so progress is
visible between tasks.
