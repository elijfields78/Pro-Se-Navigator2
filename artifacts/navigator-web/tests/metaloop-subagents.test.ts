/** Meta-loop primitive + subagent orchestration — unit tests. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  runMetaLoop,
  MetaLoopHandlers,
  MetaLoopEvent,
  META_STEPS,
  StepOutcome,
} from '../lib/metaloop/index';
import { SubagentOrchestrator } from '../lib/subagents/index';

function handlers(overrides: Partial<MetaLoopHandlers> = {}): MetaLoopHandlers {
  const ok = async (): Promise<StepOutcome> => ({});
  return {
    intake: ok,
    clarify: ok,
    verify: async () => ({ verified: true }),
    outline: async () => ({ needsApproval: true, data: 'I. Intro…' }),
    draft: ok,
    pressure_test: ok,
    memory_update: ok,
    ...overrides,
  };
}

async function collect(gen: AsyncGenerator<MetaLoopEvent>): Promise<MetaLoopEvent[]> {
  const out: MetaLoopEvent[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

// ── Meta-loop ───────────────────────────────────────────────────────────────

test('meta-loop runs all seven steps in order when outline is pre-approved', async () => {
  const events = await collect(runMetaLoop({}, handlers(), { outlineApproved: true }));
  const doneSteps = events.filter((e) => e.status === 'done').map((e) => e.step);
  assert.deepEqual(doneSteps, [...META_STEPS]);
});

test('clarify questions halt the loop — never guess past a gap', async () => {
  const events = await collect(
    runMetaLoop({}, handlers({ clarify: async () => ({ questions: ['What state do you live in?'] }) })),
  );
  const last = events.at(-1)!;
  assert.equal(last.status, 'halted');
  assert.equal(last.halt, 'blocked_on_user');
  assert.equal(last.step, 'clarify');
  // Nothing after clarify ran.
  assert.ok(!events.some((e) => e.step === 'verify' && e.status === 'done'));
});

test('verification failure hard-stops the loop before drafting', async () => {
  const events = await collect(runMetaLoop({}, handlers({ verify: async () => ({ verified: false }) })));
  const last = events.at(-1)!;
  assert.equal(last.halt, 'verification_failed');
  assert.ok(!events.some((e) => e.step === 'draft'));
});

test('outline awaits approval, then resumes without re-running completed steps', async () => {
  const first = await collect(runMetaLoop({}, handlers()));
  const halt = first.at(-1)!;
  assert.equal(halt.halt, 'awaiting_approval');
  assert.equal(halt.step, 'outline');

  // Resume: completed outcomes carried over; outline approved.
  const ranSteps: string[] = [];
  const resumed = await collect(
    runMetaLoop(
      {},
      handlers({
        intake: async () => {
          ranSteps.push('intake');
          return {};
        },
        draft: async () => {
          ranSteps.push('draft');
          return {};
        },
      }),
      {
        completed: { intake: {}, clarify: {}, verify: { verified: true }, outline: { data: 'I. Intro…' } },
        outlineApproved: true,
      },
    ),
  );
  assert.ok(!ranSteps.includes('intake')); // not re-run
  assert.ok(ranSteps.includes('draft'));
  const doneSteps = resumed.filter((e) => e.status === 'done').map((e) => e.step);
  assert.deepEqual(doneSteps, ['draft', 'pressure_test', 'memory_update']);
});

test('a throwing handler halts with error', async () => {
  const events = await collect(
    runMetaLoop({}, handlers({ draft: async () => { throw new Error('model unavailable'); } }), {
      outlineApproved: true,
    }),
  );
  const last = events.at(-1)!;
  assert.equal(last.halt, 'error');
  assert.match(last.error ?? '', /model unavailable/);
});

// ── Subagents ───────────────────────────────────────────────────────────────

test('orchestrator runs jobs in parallel and returns distilled results', async () => {
  const started: string[] = [];
  const orch = new SubagentOrchestrator(async (type, objective) => {
    started.push(type);
    await new Promise((r) => setTimeout(r, 10));
    return { summary: `${type}: ${objective} — distilled` };
  });

  const a = orch.spawn('research', 'Rule 26(f) standards');
  const b = orch.spawn('memory', 'find the canonical caption');
  // Both started without awaiting either (parallel).
  assert.equal(started.length, 2);

  const jobA = await orch.wait(a);
  const jobB = await orch.wait(b);
  assert.equal(jobA.status, 'done');
  assert.match(jobA.result!.summary, /distilled/);
  assert.equal(jobB.status, 'done');
});

test('a failing subagent reports error without poisoning others', async () => {
  const orch = new SubagentOrchestrator(async (type) => {
    if (type === 'deep_research') throw new Error('budget exhausted');
    return { summary: 'ok' };
  });
  const bad = orch.spawn('deep_research', 'everything about everything');
  const good = orch.spawn('general_purpose', 'small task');
  const jobs = await orch.waitAll();
  assert.equal(jobs.length, 2);
  assert.equal((await orch.wait(bad)).status, 'error');
  assert.equal((await orch.wait(good)).status, 'done');
});
