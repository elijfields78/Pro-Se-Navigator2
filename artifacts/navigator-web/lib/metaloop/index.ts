/**
 * The seven-step meta-loop — the code primitive every drafting task runs
 * through: Intake → Clarify → Verify → Outline → Draft → Pressure-Test →
 * Memory-Update.
 *
 * `runMetaLoop` is an async generator yielding a state event per step so the
 * chat surface can stream progress. Steps are injected handlers, which keeps
 * the loop itself pure orchestration (and unit-testable):
 *
 *  - Clarify may return questions → the loop halts `blocked_on_user` (never
 *    guess past an information gap).
 *  - Verify failing hard-stops the loop (verification is the hardest gate).
 *  - Outline requires approval → halts `awaiting_approval` unless the task
 *    was started with outline pre-approved.
 */

export const META_STEPS = [
  'intake',
  'clarify',
  'verify',
  'outline',
  'draft',
  'pressure_test',
  'memory_update',
] as const;
export type MetaStep = (typeof META_STEPS)[number];

export type LoopHalt = 'blocked_on_user' | 'awaiting_approval' | 'verification_failed' | 'error';

export interface StepOutcome {
  /** Free-form payload the next step (and the UI) can read. */
  data?: unknown;
  /** Clarify: unanswered questions that block progress. */
  questions?: string[];
  /** Verify: false blocks the loop. */
  verified?: boolean;
  /** Outline: requires user approval before drafting unless pre-approved. */
  needsApproval?: boolean;
}

export interface MetaLoopEvent {
  step: MetaStep;
  status: 'running' | 'done' | 'halted';
  halt?: LoopHalt;
  outcome?: StepOutcome;
  error?: string;
}

export interface MetaLoopContext {
  /** Accumulated outcomes by step, readable by later steps. */
  outcomes: Partial<Record<MetaStep, StepOutcome>>;
  /** The task input (case profile, ask, etc.) — opaque to the loop. */
  task: unknown;
}

export type StepHandler = (ctx: MetaLoopContext) => Promise<StepOutcome>;
export type MetaLoopHandlers = Record<MetaStep, StepHandler>;

export interface MetaLoopOptions {
  /** Resume support: skip steps already completed (their outcomes provided). */
  completed?: Partial<Record<MetaStep, StepOutcome>>;
  /** The user already approved the outline (resume after approval). */
  outlineApproved?: boolean;
}

export async function* runMetaLoop(
  task: unknown,
  handlers: MetaLoopHandlers,
  opts: MetaLoopOptions = {},
): AsyncGenerator<MetaLoopEvent, void> {
  const ctx: MetaLoopContext = { outcomes: { ...(opts.completed ?? {}) }, task };

  for (const step of META_STEPS) {
    if (ctx.outcomes[step]) continue; // already completed on a prior run

    yield { step, status: 'running' };

    let outcome: StepOutcome;
    try {
      outcome = await handlers[step](ctx);
    } catch (err) {
      yield { step, status: 'halted', halt: 'error', error: err instanceof Error ? err.message : String(err) };
      return;
    }

    // Clarify: information gaps stop the loop — never guess.
    if (step === 'clarify' && outcome.questions && outcome.questions.length > 0) {
      yield { step, status: 'halted', halt: 'blocked_on_user', outcome };
      return;
    }

    // Verify: the hardest gate.
    if (step === 'verify' && outcome.verified === false) {
      yield { step, status: 'halted', halt: 'verification_failed', outcome };
      return;
    }

    // Outline: show the user; advance only on approval.
    if (step === 'outline' && outcome.needsApproval !== false && !opts.outlineApproved) {
      ctx.outcomes[step] = outcome;
      yield { step, status: 'halted', halt: 'awaiting_approval', outcome };
      return;
    }

    ctx.outcomes[step] = outcome;
    yield { step, status: 'done', outcome };
  }
}
