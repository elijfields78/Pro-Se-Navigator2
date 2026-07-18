/**
 * Layer 2 — Verification service.
 *
 * `verifyDocumentCitations(text)` finds every citation in a document and
 * checks each against a primary source:
 *
 *   - Case citations: CourtListener citation-lookup (extraction + match),
 *     with an optional independent Perplexity web check for anything the
 *     primary source could not confirm (budgeted).
 *   - Statutes / rules / regulations: extracted locally. No free primary-
 *     source API is wired for these yet, so per the master prompt they return
 *     `needs_user_confirmation` — which BLOCKS export until the user
 *     explicitly confirms the source text. The confirmation is recorded in
 *     the verification report.
 *
 * `verificationGate(...)` is the hard export gate: a document is exportable
 * only when every citation is verified, corroborated, or user-confirmed.
 * `buildVerificationReport(...)` produces the report attached to every export.
 */

import { extractStatutoryCitations } from './extract';
import {
  lookupCaseCitations,
  isCourtListenerConfigured,
  PrimaryResult,
} from './courtlistener';
import {
  confirmCaseCitation,
  isPerplexityConfigured,
  SecondaryConfirmation,
} from './perplexity';
import {
  VerifiedCitation,
  VerificationReport,
  VerifyStatus,
  GateResult,
} from './types';

export * from './types';
export { extractStatutoryCitations } from './extract';
export { mapCourtListenerRows } from './courtlistener';
export { parseConfirmation } from './perplexity';

/** Cap paid secondary checks per document. */
const MAX_SECONDARY_CHECKS = 5;

export interface VerifyDeps {
  fetchImpl?: typeof fetch;
  /** Overridable for tests; defaults to the real adapters. */
  lookupCases?: (text: string, fetchImpl: typeof fetch) => Promise<PrimaryResult[]>;
  confirmCase?: (
    p: { citation: string; caseName?: string },
    fetchImpl: typeof fetch,
  ) => Promise<SecondaryConfirmation>;
  perplexityAvailable?: boolean;
  now?: () => Date;
}

export function isVerificationConfigured(): boolean {
  return isCourtListenerConfigured();
}

export async function verifyDocumentCitations(
  text: string,
  deps: VerifyDeps = {},
): Promise<VerifiedCitation[]> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const lookup = deps.lookupCases ?? lookupCaseCitations;
  const confirm = deps.confirmCase ?? confirmCaseCitation;
  const usePerplexity = deps.perplexityAvailable ?? isPerplexityConfigured();
  const now = deps.now ?? (() => new Date());
  const stamp = () => now().toISOString();

  const out: VerifiedCitation[] = [];

  // ── Case citations: primary source, then budgeted secondary ──
  const primary = await lookup(text, fetchImpl);
  let secondaryBudget = MAX_SECONDARY_CHECKS;

  for (const p of primary) {
    if (p.status === 'verified') {
      out.push({
        citation: p.citation,
        kind: 'case',
        status: 'verified',
        caseName: p.caseName,
        primaryUrl: p.url,
        verifiedBy: ['CourtListener'],
        checkedAt: stamp(),
      });
      continue;
    }

    if (p.status === 'not_found' && usePerplexity && secondaryBudget > 0) {
      secondaryBudget -= 1;
      try {
        const second = await confirm({ citation: p.citation, caseName: p.caseName }, fetchImpl);
        out.push({
          citation: p.citation,
          kind: 'case',
          status: second.confirmed ? 'corroborated' : 'not_found',
          caseName: p.caseName,
          primaryUrl: p.url,
          secondaryUrl: second.sourceUrl,
          verifiedBy: second.confirmed ? ['Perplexity'] : [],
          note: second.note,
          checkedAt: stamp(),
        });
        continue;
      } catch {
        // fall through to the honest primary-only mapping
      }
    }

    out.push({
      citation: p.citation,
      kind: 'case',
      status: p.status === 'ambiguous' ? 'ambiguous' : p.status === 'error' ? 'error' : 'not_found',
      caseName: p.caseName,
      primaryUrl: p.url,
      verifiedBy: p.status === 'ambiguous' ? ['CourtListener'] : [],
      checkedAt: stamp(),
    });
  }

  // ── Statutes / rules / regulations: extracted locally ──
  for (const s of extractStatutoryCitations(text)) {
    out.push({
      citation: s.citation,
      kind: s.kind,
      status: 'needs_user_confirmation',
      verifiedBy: [],
      note:
        'No free primary-source API is connected for this authority type. ' +
        'Confirm the citation against the official source text before export.',
      checkedAt: stamp(),
    });
  }

  return out;
}

/** Statuses that satisfy the export gate without user action. */
const PASSING: ReadonlySet<VerifyStatus> = new Set(['verified', 'corroborated']);

/**
 * The hard export gate. `userConfirmed` is the set of citation strings the
 * user has explicitly confirmed against source text (recorded, not assumed).
 */
export function verificationGate(
  results: VerifiedCitation[],
  userConfirmed: ReadonlySet<string> = new Set(),
): GateResult {
  const blockers: string[] = [];
  for (const r of results) {
    if (PASSING.has(r.status)) continue;
    if (r.status === 'needs_user_confirmation' && userConfirmed.has(r.citation)) continue;
    switch (r.status) {
      case 'ambiguous':
        blockers.push(`"${r.citation}" matches multiple records — pin it to one before export.`);
        break;
      case 'not_found':
        blockers.push(`"${r.citation}" could not be verified against any source — remove or replace it.`);
        break;
      case 'needs_user_confirmation':
        blockers.push(`"${r.citation}" requires your confirmation against the official source text.`);
        break;
      default:
        blockers.push(`"${r.citation}" verification errored — retry before export.`);
    }
  }
  return { pass: blockers.length === 0, blockers };
}

export function buildVerificationReport(
  results: VerifiedCitation[],
  userConfirmed: ReadonlyMap<string, string> = new Map(), // citation -> ISO confirmed-at
  now: () => Date = () => new Date(),
): VerificationReport {
  const totals: Record<VerifyStatus, number> = {
    verified: 0,
    corroborated: 0,
    ambiguous: 0,
    not_found: 0,
    needs_user_confirmation: 0,
    error: 0,
  };
  const entries = results.map((r) => {
    totals[r.status] += 1;
    const confirmedAt = userConfirmed.get(r.citation);
    return confirmedAt ? { ...r, userConfirmedAt: confirmedAt } : { ...r };
  });
  const gate = verificationGate(results, new Set(userConfirmed.keys()));
  return {
    generatedAt: now().toISOString(),
    totals,
    exportable: gate.pass,
    entries,
  };
}
