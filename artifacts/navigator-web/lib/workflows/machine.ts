/**
 * Layer 6 — Workflow FSM primitive.
 *
 * Each workflow is a linear sequence of phases; every phase has a GATE — a
 * function that inspects the accumulated artifacts and returns what's
 * missing. `advance` refuses to move while anything is missing: the user
 * cannot skip a phase, but a phase whose artifacts already exist advances
 * immediately ("the app can move fast through phases the user already has
 * covered").
 */

export interface PhaseDef<TArtifacts> {
  id: string;
  title: string;
  /** Returns human-readable missing-requirement strings; empty = gate open. */
  gate: (artifacts: TArtifacts) => string[];
}

export interface AdvanceResult {
  ok: boolean;
  phase: string;
  missing: string[];
  /** True when the workflow has completed its final phase. */
  finished: boolean;
}

export class WorkflowMachine<TArtifacts> {
  private index = 0;
  private done = false;

  constructor(
    readonly phases: ReadonlyArray<PhaseDef<TArtifacts>>,
    startPhase?: string,
  ) {
    if (phases.length === 0) throw new Error('A workflow needs at least one phase.');
    if (startPhase) {
      const i = phases.findIndex((p) => p.id === startPhase);
      if (i === -1) throw new Error(`Unknown start phase: ${startPhase}`);
      this.index = i;
    }
  }

  get current(): string {
    return this.phases[this.index]!.id;
  }

  get finished(): boolean {
    return this.done;
  }

  /** What the current phase still needs before it can advance. */
  missing(artifacts: TArtifacts): string[] {
    return this.phases[this.index]!.gate(artifacts);
  }

  /** Attempt to advance past the current phase. Refuses while the gate is closed. */
  advance(artifacts: TArtifacts): AdvanceResult {
    const missing = this.missing(artifacts);
    if (missing.length > 0) {
      return { ok: false, phase: this.current, missing, finished: false };
    }
    if (this.index === this.phases.length - 1) {
      this.done = true;
      return { ok: true, phase: this.current, missing: [], finished: true };
    }
    this.index += 1;
    return { ok: true, phase: this.current, missing: [], finished: false };
  }

  /** Advance through every phase whose gate is already open. */
  fastForward(artifacts: TArtifacts): AdvanceResult {
    let last: AdvanceResult = { ok: true, phase: this.current, missing: [], finished: this.done };
    while (!this.done) {
      const res = this.advance(artifacts);
      if (!res.ok) return res;
      last = res;
    }
    return last;
  }
}
