/**
 * End-to-end: the cold-start workflow on the Chase fact pattern (Cold-Start
 * §16). Mechanics-only by owner decision: the test proves phases advance
 * only through their gates, artifacts accumulate, guardrails fire on the
 * complaint export, and the reactive handoff carries everything — it does
 * NOT hard-code legal conclusions (the viability engine computes honestly).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createColdStartMachine, buildReactiveHandoff, ColdStartArtifacts } from '../lib/workflows/coldStart';
import { runStoryIntake, gapFillerQuestions, StoryExtractionSchema } from '../lib/workflows/storyIntake';
import { routeInboundFiling, REACTIVE_MODULES } from '../lib/workflows/reactive';
import { runExportGate } from '../lib/guardrails/index';
import { InMemoryStore } from '../lib/memory/index';
import { VerifiedCitation } from '../lib/verification/index';

const CAPTION = 'ELI FIELDS, Plaintiff, v. JPMORGAN CHASE BANK, N.A., Defendant.';
const SIGNATURE = 'Eli Fields, Plaintiff Pro Se';

const CHASE_STORY =
  'I applied for a credit card at Chase. Then I sent them a document I believed had value. ' +
  'They kept it. Never responded. Never gave me the credit. Never returned the document. ' +
  'It has been eight months. I mailed them certified letters in December 2025 and January 2026.';

// ── Phase 1: story intake with a deterministic fake LLM ─────────────────────

test('E2E phase 1: story intake extracts, narrates, and asks only missing gap-fillers', async () => {
  const fakeLlm = async (system: string, _user: string) => {
    if (system.includes('intake listener')) {
      return JSON.stringify({
        who: ['Chase'],
        what: 'Applied for credit; sent a document; Chase retained it without response.',
        when: ['December 2025', 'January 2026'],
        where: '',
        harm: ['no credit decision', 'document retained'],
        priorContact: ['certified letters in December 2025 and January 2026'],
        mentionedDeadlines: [],
      });
    }
    return 'The user applied for credit with Chase, mailed documents by certified mail in December 2025 and January 2026, and received no response over eight months.';
  };

  const result = await runStoryIntake(CHASE_STORY, fakeLlm);
  assert.equal(result.extraction.who[0], 'Chase');
  assert.ok(result.narrative.length > 20);
  // Gap-fillers: where + arbitration + amount are missing; when/priorContact are not.
  assert.ok(result.questions.some((q) => q.includes('Where do you live')));
  assert.ok(result.questions.some((q) => q.toLowerCase().includes('arbitration')));
  assert.ok(!result.questions.some((q) => q.includes('when this first happened')));
});

test('story extraction survives malformed model output (falls back to empty schema)', async () => {
  const garbage = async () => 'not json at all';
  const res = await runStoryIntake('story', garbage);
  assert.deepEqual(res.extraction, StoryExtractionSchema.parse({}));
  // Everything missing → all five gap-fillers asked.
  assert.equal(gapFillerQuestions(res.extraction).length, 5);
});

// ── The nine-phase walk ─────────────────────────────────────────────────────

test('E2E: nine phases gate correctly on the Chase pattern and hand off to reactive', async () => {
  const machine = createColdStartMachine();
  const memory = new InMemoryStore();
  const a: ColdStartArtifacts = {};

  // Phase 1 gate: cannot advance with nothing.
  assert.equal(machine.current, 'story_intake');
  let res = machine.advance(a);
  assert.equal(res.ok, false);
  assert.ok(res.missing.length >= 1);

  // Cannot skip ahead: gates evaluate the CURRENT phase only.
  a.factNarrative = 'Structured narrative: credit application, tender, retention, eight-month silence.';
  res = machine.advance(a);
  assert.equal(res.ok, false, 'approval still missing');
  a.factNarrativeApproved = true;
  assert.equal(machine.advance(a).ok, true);
  assert.equal(machine.current, 'evidence_inventory');

  // Phase 2
  assert.equal(machine.advance(a).ok, false);
  a.evidenceIndexed = true;
  a.evidenceCount = 5; // application confirmation, instrument, receipts, return cards
  assert.equal(machine.advance(a).ok, true);
  assert.equal(machine.current, 'legal_theory_discovery');

  // Phase 3
  a.selectedTheories = ['ECOA adverse-action notice', 'Failure to account', 'Conversion'];
  assert.equal(machine.advance(a).ok, true);

  // Phase 4 — viability computed by the engine; a HOLD blocks until resolved.
  a.viabilityReport = [
    { claim: 'ECOA adverse-action notice', status: 'pass' },
    { claim: 'Failure to account', status: 'pass' },
    { claim: 'Conversion', status: 'hold', notes: 'needs pre-suit notice' },
  ];
  res = machine.advance(a);
  assert.equal(res.ok, false, 'HOLD claim blocks the gate');
  a.viabilityReport = a.viabilityReport.map((v) =>
    v.claim === 'Conversion' ? { ...v, status: 'pass' as const } : v,
  );
  assert.equal(machine.advance(a).ok, true);
  assert.equal(machine.current, 'pre_suit_steps');

  // Phase 5 — arbitration check + identified requirements must be satisfied.
  a.preSuitRequired = ['LUTPA pre-suit notice', 'Demand letter'];
  res = machine.advance(a);
  assert.equal(res.ok, false);
  a.arbitrationChecked = true;
  a.preSuitCompleted = ['LUTPA pre-suit notice'];
  res = machine.advance(a);
  assert.equal(res.ok, false, 'demand letter still outstanding');
  a.preSuitCompleted = ['LUTPA pre-suit notice', 'Demand letter'];
  assert.equal(machine.advance(a).ok, true);
  assert.equal(machine.current, 'court_selection');

  // Phase 6 — court profile + the "do you actually want to do this" gate.
  a.courtProfile = {
    courtName: 'U.S. District Court, Middle District of Louisiana',
    division: 'Baton Rouge',
    filingMethod: 'pacer',
    localRulesLoaded: true,
  };
  res = machine.advance(a);
  assert.equal(res.ok, false, 'commitment gate blocks');
  a.commitmentConfirmed = true;
  assert.equal(machine.advance(a).ok, true);
  assert.equal(machine.current, 'complaint_drafting');

  // Phase 7 — guardrails fire on the complaint export.
  await memory.setCanonicalCaption('case-1', CAPTION);
  await memory.setSignatureBlock('case-1', SIGNATURE);
  const mem = await memory.getCaseMemory('case-1');

  const verification: VerifiedCitation[] = [
    { citation: '532 U.S. 742', kind: 'case', status: 'verified', verifiedBy: ['CourtListener'], checkedAt: 'x' },
    { citation: '15 U.S.C. § 1691(d)', kind: 'statute', status: 'needs_user_confirmation', verifiedBy: [], checkedAt: 'x' },
  ];

  // A draft containing banned vocabulary AND an unconfirmed statute is blocked.
  const badGate = runExportGate(
    { title: 'Complaint', body: 'Chase deceived Plaintiff.', caption: CAPTION, signatureBlock: SIGNATURE },
    { memory: mem, verification },
  );
  assert.equal(badGate.pass, false);
  assert.ok(badGate.findings.some((f) => f.guardrail === 'banned_vocabulary'));
  assert.ok(badGate.findings.some((f) => f.guardrail === 'verification_gate'));

  // Clean body + user-confirmed statute → gate opens.
  const goodGate = runExportGate(
    { title: 'Complaint', body: 'The record demonstrates non-response over eight months.', caption: CAPTION, signatureBlock: SIGNATURE },
    { memory: mem, verification, userConfirmedCitations: new Set(['15 U.S.C. § 1691(d)']) },
  );
  assert.equal(goodGate.pass, true);

  a.complaintDrafted = true;
  a.complaintVerified = goodGate.pass;
  assert.equal(machine.advance(a).ok, true);

  // Phase 8
  a.packetComplete = true;
  assert.equal(machine.advance(a).ok, true);
  assert.equal(machine.current, 'service_and_docketing');

  // Phase 9 → finished.
  a.docketNumber = '3:26-cv-00287';
  a.serviceCompleted = true;
  res = machine.advance(a);
  assert.equal(res.ok, true);
  assert.equal(res.finished, true);
  assert.equal(machine.finished, true);

  // Handoff: nothing lost (Cold-Start §15).
  const handoff = buildReactiveHandoff(a);
  assert.equal(handoff.docketNumber, '3:26-cv-00287');
  assert.equal(handoff.selectedTheories.length, 3);
  assert.equal(handoff.evidenceCount, 5);
  assert.equal(handoff.viabilityReport.length, 3);
});

test('handoff refuses an incomplete cold start', () => {
  assert.throws(() => buildReactiveHandoff({ factNarrative: 'x' }), /handoff incomplete/);
});

// ── Reactive routing sanity ─────────────────────────────────────────────────

test('reactive router sends an opposing motion to the response generator with a deadline', () => {
  const decision = routeInboundFiling({ kind: 'motion', title: 'Motion to Strike', filedBy: 'opponent', responseDays: 21 });
  assert.equal(decision.module, 'response_generator');
  assert.equal(decision.createDeadline, true);
  assert.ok(decision.chips.length >= 4 && decision.chips.length <= 6);
  assert.equal(REACTIVE_MODULES.length, 14);
});
