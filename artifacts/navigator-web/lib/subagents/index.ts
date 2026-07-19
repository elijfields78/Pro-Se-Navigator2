/**
 * Layer 4 — Subagent orchestration.
 *
 * A worker pattern: heavy tasks (memory mining, deep research, document
 * generation) run in their own model call with their own context and return a
 * DISTILLED result — the main conversation never inherits a subagent's full
 * context, only the summary (plus optional file references).
 */

export const SUBAGENT_TYPES = [
  'research',
  'deep_research',
  'memory',
  'past_context',
  'asset',
  'coding',
  'general_purpose',
  'website_building', // reserved for future
] as const;
export type SubagentType = (typeof SUBAGENT_TYPES)[number];

export interface SubagentResult {
  summary: string;
  fileRefs?: string[];
}

export interface SubagentJob {
  id: string;
  type: SubagentType;
  objective: string;
  status: 'queued' | 'running' | 'done' | 'error';
  result?: SubagentResult;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

/** Runs one subagent job to completion. Injectable: tests use fakes; the app
 *  uses `anthropicRunner`. */
export type SubagentRunner = (type: SubagentType, objective: string) => Promise<SubagentResult>;

let seq = 0;
function jobId(): string {
  seq += 1;
  return `job-${Date.now().toString(36)}-${seq}`;
}

export class SubagentOrchestrator {
  private jobs = new Map<string, SubagentJob>();
  private running = new Map<string, Promise<void>>();

  constructor(private runner: SubagentRunner) {}

  /** Spawn a subagent; returns immediately with the job id (parallel by default). */
  spawn(type: SubagentType, objective: string): string {
    const id = jobId();
    const job: SubagentJob = { id, type, objective, status: 'queued' };
    this.jobs.set(id, job);

    const p = (async () => {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      try {
        job.result = await this.runner(type, objective);
        job.status = 'done';
      } catch (err) {
        job.status = 'error';
        job.error = err instanceof Error ? err.message : String(err);
      } finally {
        job.finishedAt = new Date().toISOString();
        // Settled promises are dropped so a long-lived orchestrator doesn't
        // accumulate them; job records (with results) stay in `jobs`.
        this.running.delete(id);
      }
    })();
    this.running.set(id, p);
    return id;
  }

  get(id: string): SubagentJob | undefined {
    return this.jobs.get(id);
  }

  /** Wait for one job; returns its final state. */
  async wait(id: string): Promise<SubagentJob> {
    const p = this.running.get(id);
    if (p) await p;
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Unknown subagent job: ${id}`);
    return job;
  }

  /** Wait for all currently-spawned jobs. */
  async waitAll(): Promise<SubagentJob[]> {
    await Promise.all(this.running.values());
    return [...this.jobs.values()];
  }
}

// ── Anthropic-backed default runner ─────────────────────────────────────────

/** Model routing per the master prompt: cheap models for low-stakes work,
 *  the strongest model for research/drafting-grade objectives. */
const TYPE_MODEL: Record<SubagentType, string> = {
  research: 'claude-sonnet-5',
  deep_research: 'claude-sonnet-5',
  memory: 'claude-haiku-4-5-20251001',
  past_context: 'claude-haiku-4-5-20251001',
  asset: 'claude-sonnet-5',
  coding: 'claude-sonnet-5',
  general_purpose: 'claude-sonnet-5',
  website_building: 'claude-sonnet-5',
};

const TYPE_SYSTEM: Record<SubagentType, string> = {
  research:
    'You are a research subagent. Investigate the objective using only well-supported facts. Return a distilled summary (max ~400 words) of findings with source names. No speculation.',
  deep_research:
    'You are a deep-research subagent. Compile findings across multiple angles of the objective. Return a structured, distilled synthesis (max ~600 words).',
  memory:
    'You are a memory subagent. Given case memory excerpts in the objective, extract only the facts relevant to the stated goal. Return a distilled list.',
  past_context:
    'You are a context-retrieval subagent. Return only the specific prior context requested, distilled.',
  asset:
    'You are a document-generation subagent. Produce the requested document content, complete and well-structured, ready for formatting.',
  coding: 'You are a coding subagent. Produce or modify code exactly as specified.',
  general_purpose: 'You are a general-purpose subagent. Complete the objective and return a distilled result.',
  website_building: 'Reserved. Return: "website_building is not yet available."',
};

/** Default runner: one isolated Anthropic call per job. Lazily imports the SDK
 *  so test environments without the key never touch it. */
export function anthropicRunner(): SubagentRunner {
  return async (type, objective) => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: TYPE_MODEL[type],
      max_tokens: 2000,
      system: TYPE_SYSTEM[type],
      messages: [{ role: 'user', content: objective }],
    });
    const summary = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return { summary };
  };
}
