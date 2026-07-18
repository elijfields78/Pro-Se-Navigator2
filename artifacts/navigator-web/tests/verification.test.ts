/**
 * Layer 2 verification service — unit tests. No network: adapters are
 * exercised through pure mappers and injected fakes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractStatutoryCitations } from '../lib/verification/extract';
import { mapCourtListenerRows } from '../lib/verification/courtlistener';
import { parseConfirmation } from '../lib/verification/perplexity';
import {
  verifyDocumentCitations,
  verificationGate,
  buildVerificationReport,
  VerifiedCitation,
} from '../lib/verification/index';

// ── Extraction ──────────────────────────────────────────────────────────────

test('extracts U.S.C., C.F.R., FRCP, and Louisiana citations from prose', () => {
  const text =
    'Chase provided no adverse-action notice under 15 U.S.C. § 1691(d). ' +
    'The CIP requirement in 31 C.F.R. § 1020.220 applies. Substitution is ' +
    'governed by Fed. R. Civ. P. 17(a)(3), and dishonor evidence by ' +
    'La. R.S. § 10:3-505. Deposit obligations arise under La. Civ. Code art. 2926.';
  const found = extractStatutoryCitations(text);
  const citations = found.map((f) => f.citation);
  assert.ok(citations.includes('15 U.S.C. § 1691(d)'));
  assert.ok(citations.includes('31 C.F.R. § 1020.220'));
  assert.ok(citations.includes('Fed. R. Civ. P. 17(a)(3)'));
  assert.ok(citations.includes('La. R.S. § 10:3-505'));
  assert.ok(citations.includes('La. Civ. Code art. 2926'));
  assert.equal(found.find((f) => f.citation.startsWith('15 U.S.C.'))?.kind, 'statute');
  assert.equal(found.find((f) => f.citation.startsWith('31 C.F.R.'))?.kind, 'regulation');
  assert.equal(found.find((f) => f.citation.startsWith('Fed. R.'))?.kind, 'rule');
});

test('extraction deduplicates and ignores citation-free prose', () => {
  const dup = 'See 15 U.S.C. § 1691(d); again 15 U.S.C. § 1691(d).';
  assert.equal(extractStatutoryCitations(dup).length, 1);
  assert.equal(extractStatutoryCitations('The defendant never responded to the letter.').length, 0);
});

// ── CourtListener mapping ───────────────────────────────────────────────────

test('maps CourtListener rows: 200/one-cluster verified, 300 ambiguous, 404 not_found', () => {
  const rows = mapCourtListenerRows([
    {
      citation: '532 U.S. 742',
      status: 200,
      clusters: [{ case_name: 'New Hampshire v. Maine', absolute_url: '/opinion/118445/' }],
    },
    { citation: '100 F.3d 1', status: 300, clusters: [{ case_name: 'A' }, { case_name: 'B' }] },
    { citation: '999 F.9th 999', status: 404, clusters: [] },
  ]);
  assert.equal(rows[0]!.status, 'verified');
  assert.equal(rows[0]!.caseName, 'New Hampshire v. Maine');
  assert.ok(rows[0]!.url?.startsWith('https://www.courtlistener.com/'));
  assert.equal(rows[1]!.status, 'ambiguous');
  assert.equal(rows[2]!.status, 'not_found');
});

// ── Perplexity verdict parsing ──────────────────────────────────────────────

test('parses strict confirmation verdicts', () => {
  const yes = parseConfirmation(
    'VERDICT: CONFIRMED\nSOURCE: https://law.justia.com/x\nNOTE: Reported in official reporter.',
  );
  assert.equal(yes.confirmed, true);
  assert.equal(yes.sourceUrl, 'https://law.justia.com/x');
  const no = parseConfirmation('VERDICT: NOT-CONFIRMED\nSOURCE: NONE\nNOTE: No source found.');
  assert.equal(no.confirmed, false);
  assert.equal(no.sourceUrl, undefined);
});

// ── Orchestrator ────────────────────────────────────────────────────────────

test('orchestrator merges case results with statutory extraction and corroborates via secondary', async () => {
  const text =
    'Under New Hampshire v. Maine, 532 U.S. 742 (2001), and 15 U.S.C. § 1691(d), ' +
    'plus Smith v. Nobody, 111 F.4th 555 (5th Cir. 2099).';

  const results = await verifyDocumentCitations(text, {
    lookupCases: async () => [
      {
        citation: '532 U.S. 742',
        status: 'verified',
        caseName: 'New Hampshire v. Maine',
        url: 'https://www.courtlistener.com/opinion/118445/',
      },
      { citation: '111 F.4th 555', status: 'not_found' },
    ],
    confirmCase: async ({ citation }) =>
      citation === '111 F.4th 555'
        ? { confirmed: true, sourceUrl: 'https://example.com/opinion', note: 'web source' }
        : { confirmed: false },
    perplexityAvailable: true,
    now: () => new Date('2026-07-18T12:00:00Z'),
  });

  const byCitation = new Map(results.map((r) => [r.citation, r]));
  assert.equal(byCitation.get('532 U.S. 742')?.status, 'verified');
  assert.deepEqual(byCitation.get('532 U.S. 742')?.verifiedBy, ['CourtListener']);
  assert.equal(byCitation.get('111 F.4th 555')?.status, 'corroborated');
  assert.deepEqual(byCitation.get('111 F.4th 555')?.verifiedBy, ['Perplexity']);
  assert.equal(byCitation.get('15 U.S.C. § 1691(d)')?.status, 'needs_user_confirmation');
});

test('orchestrator reports not_found honestly when secondary also fails', async () => {
  const results = await verifyDocumentCitations('Fake v. Case, 1 F.1st 1 (1st Cir. 1999).', {
    lookupCases: async () => [{ citation: '1 F.1st 1', status: 'not_found' }],
    confirmCase: async () => ({ confirmed: false, note: 'no source' }),
    perplexityAvailable: true,
  });
  assert.equal(results[0]!.status, 'not_found');
  assert.deepEqual(results[0]!.verifiedBy, []);
});

// ── The hard gate ───────────────────────────────────────────────────────────

function cite(citation: string, status: VerifiedCitation['status']): VerifiedCitation {
  return { citation, kind: 'case', status, verifiedBy: [], checkedAt: '2026-07-18T12:00:00Z' };
}

test('gate passes only verified/corroborated/user-confirmed citations', () => {
  assert.equal(verificationGate([]).pass, true); // no citations → nothing to verify

  assert.equal(verificationGate([cite('A', 'verified'), cite('B', 'corroborated')]).pass, true);

  const blockedNotFound = verificationGate([cite('A', 'verified'), cite('X', 'not_found')]);
  assert.equal(blockedNotFound.pass, false);
  assert.equal(blockedNotFound.blockers.length, 1);

  assert.equal(verificationGate([cite('Y', 'ambiguous')]).pass, false);
  assert.equal(verificationGate([cite('Z', 'error')]).pass, false);

  const statute = cite('15 U.S.C. § 1691(d)', 'needs_user_confirmation');
  assert.equal(verificationGate([statute]).pass, false);
  assert.equal(verificationGate([statute], new Set(['15 U.S.C. § 1691(d)'])).pass, true);
});

// ── Report ──────────────────────────────────────────────────────────────────

test('report totals, exportability, and user-confirmation stamps', () => {
  const results = [
    cite('A', 'verified'),
    cite('B', 'not_found'),
    cite('C', 'needs_user_confirmation'),
  ];
  const confirmed = new Map([['C', '2026-07-18T13:00:00Z']]);
  const report = buildVerificationReport(results, confirmed, () => new Date('2026-07-18T14:00:00Z'));

  assert.equal(report.totals.verified, 1);
  assert.equal(report.totals.not_found, 1);
  assert.equal(report.totals.needs_user_confirmation, 1);
  assert.equal(report.exportable, false); // B blocks
  assert.equal(report.entries.find((e) => e.citation === 'C')?.userConfirmedAt, '2026-07-18T13:00:00Z');
  assert.equal(report.generatedAt, '2026-07-18T14:00:00.000Z');

  const exportable = buildVerificationReport([cite('A', 'verified')], new Map());
  assert.equal(exportable.exportable, true);
});
