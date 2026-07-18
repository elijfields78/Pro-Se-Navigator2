/**
 * Layer 2 — Verification service types.
 *
 * Verification is the hardest gate in the product: no draft leaves any
 * workflow phase until every statutory and case citation is checked against a
 * primary source. Verification is deliberately mechanical — API lookups and
 * text matching, never a reasoning model.
 */

export type CitationKind = 'case' | 'statute' | 'rule' | 'regulation';

export type VerifyStatus =
  /** Primary source (CourtListener) confirmed exactly one real case. */
  | 'verified'
  /** Primary source couldn't confirm, but an independent web check did. */
  | 'corroborated'
  /** Real citation but multiple matching records — must be pinned before use. */
  | 'ambiguous'
  /** No source could confirm — possible hallucination. Blocks export. */
  | 'not_found'
  /**
   * No free primary-source API exists for this authority type yet. Blocks
   * export until the user explicitly confirms they checked the source text.
   * The confirmation (who/when) is recorded in the verification report.
   */
  | 'needs_user_confirmation'
  /** Lookup failed (network/API error). Blocks export; retryable. */
  | 'error';

export interface VerifiedCitation {
  /** The citation exactly as extracted, e.g. "15 U.S.C. § 1691(d)". */
  citation: string;
  kind: CitationKind;
  status: VerifyStatus;
  /** Matched case name, when the primary source returned one. */
  caseName?: string;
  /** Primary-source URL (CourtListener opinion, statute text). */
  primaryUrl?: string;
  /** Independent secondary-source URL, when the web corroborated. */
  secondaryUrl?: string;
  /** Which checkers confirmed it, e.g. ["CourtListener"], ["Perplexity"]. */
  verifiedBy: string[];
  note?: string;
  checkedAt: string; // ISO timestamp
}

export interface VerificationReport {
  generatedAt: string;
  totals: Record<VerifyStatus, number>;
  /** True when every entry passes the export gate. */
  exportable: boolean;
  entries: Array<
    VerifiedCitation & {
      /** Set when a needs_user_confirmation entry was confirmed by the user. */
      userConfirmedAt?: string;
    }
  >;
}

export interface GateResult {
  pass: boolean;
  /** Human-readable reasons the export is blocked; empty when pass. */
  blockers: string[];
}
