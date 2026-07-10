---
name: Deadline generation architecture
description: How the post-artifact deadline suggestion + Rule 6 calculation flow works
---

## Flow
1. `addArtifact` (now async) → saves artifact → looks up `DeadlineRule` from `lib/deadlineRules.ts`
2. Posts estimate navigator message + sets `case.pendingFollowUp: { kind: 'deadline_date_entry', ... }` (persisted to Supabase JSONB `pending_follow_up` column)
3. `CaseChat` reads `pendingEntry` from case, renders `DeadlineDateEntry` in place of `ChatInput`
4. User submits trigger date → `submitDeadlineTriggerDate` → `lib/rule6.ts` computes deadline → deadline DB insert awaited (failure throws, widget stays active) → confirmation messages posted

## Entry point from chat
- "Help me write something" / "I need to write something" → `followUpPrompt` + `followUpNextSteps: DRAFT_TYPE_NEXT_STEPS`
- Each `DRAFT_TYPE_NEXT_STEPS` item has `action: 'create_draft'` + `actionData: { title, kind }`
- `sendMessage` detects action step before follow-up/intake logic → posts user message only → calls `addArtifact`

## PendingFollowUp union
Two variants in `contexts/types.ts`:
- `PendingIntakeFollowUp` — `{ kind: 'intake_follow_up'; prompt; resumeTurnIndex }`
- `PendingDeadlineEntry` — `{ kind: 'deadline_date_entry'; artifactId; artifactTitle; estimatedDays; ruleBasis; description; triggerDateLabel; reasoning }`
Old DB rows without `kind` are migrated to `intake_follow_up` in `dbToCase`.

## Key durability rules
- `submitDeadlineTriggerDate`: deadline DB insert AWAITED before state update; throw on failure keeps widget active
- `addArtifact`: estimate message + case update failure → rollback optimistic pending state (removes message + clears pendingFollowUp from local state)

**Why:** Code review flagged fire-and-forget deadline insert as showing false success confirmation; fixed to await + surface error.

## How to apply
- When Phase 6 AI drafts documents, call `addArtifact(...)` directly — the estimate flow triggers automatically for all non-note kinds
- `lib/deadlineRules.ts` uses keyword matching on artifact title; add new rules there as case types expand
- Rule 6 calculator: `computeRule6Deadline(triggerDate: Date, days: number) → 'YYYY-MM-DD'`
- `notes` (`kind === 'note'`) skip the deadline flow entirely
