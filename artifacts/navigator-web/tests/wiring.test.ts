/** DB↔FSM bridge — computeArtifacts / missingForPhase / tryAdvance. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeArtifacts,
  missingForPhase,
  tryAdvance,
  CaseRow,
  PhaseStateRow,
  TheoryRow,
} from '../lib/db/cases';

function caseRow(overrides: Partial<CaseRow> = {}): CaseRow {
  return {
    id: 'c1',
    title: 'My case',
    workflow: 'cold_start',
    canonical_caption: null,
    signature_block: null,
    court_name: null,
    court_division: null,
    docket_number: null,
    filing_method: null,
    fact_narrative: null,
    fact_narrative_approved: false,
    ...overrides,
  };
}

function phaseRow(phase: string, gate: Record<string, unknown> = {}): PhaseStateRow {
  return { phase, workflow: 'cold_start', gate_artifacts: gate };
}

test('computeArtifacts assembles gate inputs from stored rows only', () => {
  const theories: TheoryRow[] = [
    { claim_name: 'ECOA notice', selected: true, viability: 'pass', viability_notes: null },
    { claim_name: 'Conversion', selected: false, viability: 'untested', viability_notes: null },
  ];
  const a = computeArtifacts(
    caseRow({ fact_narrative: 'n', fact_narrative_approved: true, court_name: 'S.D. Tex.', filing_method: 'pacer' }),
    phaseRow('court_selection', { localRulesLoaded: true, commitmentConfirmed: true }),
    theories,
    3,
  );
  assert.equal(a.factNarrative, 'n');
  assert.equal(a.factNarrativeApproved, true);
  assert.equal(a.evidenceIndexed, true);
  assert.equal(a.evidenceCount, 3);
  assert.deepEqual(a.selectedTheories, ['ECOA notice']);
  assert.equal(a.viabilityReport?.length, 1); // untested rows are not a report entry
  assert.equal(a.courtProfile?.courtName, 'S.D. Tex.');
  assert.equal(a.courtProfile?.localRulesLoaded, true);
  assert.equal(a.commitmentConfirmed, true);
});

test('missingForPhase reports gate requirements for the stored phase', () => {
  const a = computeArtifacts(caseRow(), phaseRow('story_intake'), [], 0);
  const missing = missingForPhase('story_intake', a);
  assert.equal(missing.length, 2); // narrative + approval

  const approved = computeArtifacts(
    caseRow({ fact_narrative: 'n', fact_narrative_approved: true }),
    phaseRow('story_intake'),
    [],
    0,
  );
  assert.equal(missingForPhase('story_intake', approved).length, 0);
});

test('tryAdvance moves exactly one phase and never skips a closed gate', () => {
  // Approved narrative → story_intake advances to evidence_inventory…
  const approved = computeArtifacts(
    caseRow({ fact_narrative: 'n', fact_narrative_approved: true }),
    phaseRow('story_intake'),
    [],
    0,
  );
  const step1 = tryAdvance('story_intake', approved);
  assert.equal(step1.advanced, true);
  assert.equal(step1.phase, 'evidence_inventory');

  // …but evidence gate stays closed with zero items.
  const step2 = tryAdvance('evidence_inventory', approved);
  assert.equal(step2.advanced, false);
  assert.equal(step2.phase, 'evidence_inventory');
  assert.ok(step2.missing.length > 0);

  // Client cannot leapfrog: advancing from a later stored phase still
  // evaluates THAT phase's gate against real artifacts.
  const leap = tryAdvance('complaint_drafting', approved);
  assert.equal(leap.advanced, false);
  assert.ok(leap.missing.some((m) => m.toLowerCase().includes('complaint')));
});

test('final phase advance reports finished', () => {
  const done = computeArtifacts(
    caseRow({ fact_narrative: 'n', fact_narrative_approved: true, docket_number: '1:26-cv-01234' }),
    phaseRow('service_and_docketing', { serviceCompleted: true }),
    [],
    1,
  );
  const res = tryAdvance('service_and_docketing', done);
  assert.equal(res.advanced, true);
  assert.equal(res.finished, true);
});
