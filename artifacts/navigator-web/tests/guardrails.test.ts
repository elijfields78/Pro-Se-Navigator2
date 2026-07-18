/** Layer 5 guardrails — unit tests for each check and the composed gate. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  runExportGate,
  checkCaptionLock,
  checkSignatureLock,
  checkTone,
  checkBannedVocabulary,
  checkFactualConsistency,
  checkDeadlineSafetyMargin,
  computeSafetyDate,
  ExportContext,
  DraftDocument,
} from '../lib/guardrails/index';
import { CaseMemory } from '../lib/memory/index';
import { VerifiedCitation } from '../lib/verification/index';

const CAPTION = 'ELI FIELDS, Plaintiff, v. JPMORGAN CHASE BANK, N.A., Defendant.';
const SIGNATURE = 'Eli Fields, Plaintiff Pro Se';

function memory(overrides: Partial<CaseMemory> = {}): CaseMemory {
  return {
    caseId: 'case-1',
    canonicalCaption: CAPTION,
    signatureBlock: SIGNATURE,
    toneProfile: { rules: {}, bannedExtra: [] },
    events: [],
    assets: [],
    ...overrides,
  };
}

function ctx(overrides: Partial<ExportContext> = {}): ExportContext {
  return { memory: memory(), verification: [], ...overrides };
}

function doc(overrides: Partial<DraftDocument> = {}): DraftDocument {
  return { title: 'Test Motion', body: 'The record demonstrates timely presentment.', caption: CAPTION, signatureBlock: SIGNATURE, ...overrides };
}

function verifiedCite(citation: string, status: VerifiedCitation['status']): VerifiedCitation {
  return { citation, kind: 'case', status, verifiedBy: [], checkedAt: '2026-07-18T12:00:00Z' };
}

// ── Caption / signature locks ───────────────────────────────────────────────

test('caption lock blocks a drifted caption and demands one when unset', () => {
  assert.equal(checkCaptionLock(doc(), ctx()).length, 0);

  const drifted = checkCaptionLock(doc({ caption: 'GLOBAL LEGENDS TRUST v. CHASE' }), ctx());
  assert.equal(drifted.length, 1);
  assert.equal(drifted[0]!.severity, 'blocking');
  assert.equal(drifted[0]!.suggestion, CAPTION);

  const unset = checkCaptionLock(doc(), ctx({ memory: memory({ canonicalCaption: undefined }) }));
  assert.equal(unset.length, 1);
});

test('signature lock mirrors caption-lock behavior', () => {
  assert.equal(checkSignatureLock(doc(), ctx()).length, 0);
  const bad = checkSignatureLock(doc({ signatureBlock: 'Dawn M. Fields' }), ctx());
  assert.equal(bad.length, 1);
  assert.equal(bad[0]!.severity, 'blocking');
});

// ── Banned vocabulary ───────────────────────────────────────────────────────

test('banned vocabulary blocks counsel pejoratives and sovereign-citizen terms', () => {
  const counsel = checkBannedVocabulary(doc({ body: 'Opposing counsel lied to the court.' }), ctx());
  assert.equal(counsel.length, 1);
  assert.equal(counsel[0]!.severity, 'blocking');
  assert.ok(counsel[0]!.suggestion);

  const sovereign = checkBannedVocabulary(
    doc({ body: 'As a natural person, plaintiff invokes silent dishonor.' }),
    ctx(),
  );
  assert.equal(sovereign.length, 2);

  assert.equal(checkBannedVocabulary(doc(), ctx()).length, 0);
  // Word-boundary: "defrauded" contains "fraud" as a substring but not a word.
  assert.equal(checkBannedVocabulary(doc({ body: 'The defrauding-adjacent word test.' }), ctx()).length, 0);
});

// ── Tone filter ─────────────────────────────────────────────────────────────

test('tone filter flags exclamations and case-specific banned phrases (advisory)', () => {
  const m = memory({ toneProfile: { rules: { no_exclamations: true }, bannedExtra: ['vapor money'] } });
  const findings = checkTone(doc({ body: 'This is outrageous! The vapor money doctrine applies.' }), ctx({ memory: m }));
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.severity === 'advisory'));
  assert.ok(findings[0]!.suggestion?.includes('outrageous.'));
});

// ── Deadline safety margin ──────────────────────────────────────────────────

test('computeSafetyDate is 20% earlier, at least one day for day-scale intervals', () => {
  // 10-day interval → 2 days earlier
  assert.equal(computeSafetyDate('2026-07-01', '2026-07-11'), '2026-07-09');
  // 30-day interval → 6 days earlier
  assert.equal(computeSafetyDate('2026-07-01', '2026-07-31'), '2026-07-25');
  // 2-day interval → 20% is under a day; still at least one full day earlier
  assert.equal(computeSafetyDate('2026-07-01', '2026-07-03'), '2026-07-02');
});

test('deadline margin check blocks a safety date later than the 20% margin', () => {
  const good = checkDeadlineSafetyMargin(doc(), ctx({
    deadlines: [{ title: 'Opposition due', createdAt: '2026-07-01', dueDate: '2026-07-31', safetyDate: '2026-07-25' }],
  }));
  assert.equal(good.length, 0);

  const bad = checkDeadlineSafetyMargin(doc(), ctx({
    deadlines: [{ title: 'Opposition due', createdAt: '2026-07-01', dueDate: '2026-07-31', safetyDate: '2026-07-30' }],
  }));
  assert.equal(bad.length, 1);
  assert.equal(bad[0]!.suggestion, '2026-07-25');
});

// ── Factual consistency ─────────────────────────────────────────────────────

test('factual consistency flags unreferenced assertions (advisory)', () => {
  const findings = checkFactualConsistency(
    doc({
      factualAssertions: [
        { text: 'Chase received the mailing on December 12, 2025.', refs: ['EV-003'] },
        { text: 'Chase never responded.', refs: [] },
      ],
    }),
    ctx(),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0]!.severity, 'advisory');
});

// ── The composed export gate ────────────────────────────────────────────────

test('export gate passes a clean document and blocks on any blocking finding', () => {
  const clean = runExportGate(doc(), ctx({ verification: [verifiedCite('532 U.S. 742', 'verified')] }));
  assert.equal(clean.pass, true);

  const unverified = runExportGate(doc(), ctx({ verification: [verifiedCite('1 F.1st 1', 'not_found')] }));
  assert.equal(unverified.pass, false);

  const banned = runExportGate(doc({ body: 'They deceived everyone.' }), ctx());
  assert.equal(banned.pass, false);

  // Advisory-only findings do not block.
  const advisoryOnly = runExportGate(
    doc({ factualAssertions: [{ text: 'Unreferenced assertion.', refs: [] }] }),
    ctx(),
  );
  assert.equal(advisoryOnly.pass, true);
  assert.equal(advisoryOnly.findings.length, 1);
});
