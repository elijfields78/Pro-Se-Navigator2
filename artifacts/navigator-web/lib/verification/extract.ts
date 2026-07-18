/**
 * Statute / rule / regulation extraction.
 *
 * CourtListener's citation-lookup API extracts CASE citations from raw text
 * server-side, so we don't re-implement reporter parsing here. This module
 * extracts the authority types CourtListener does not cover: federal statutes
 * (U.S.C.), federal regulations (C.F.R.), federal rules (Fed. R. Civ. P.),
 * and the state formats the product needs first (La. R.S., La. Civ. Code).
 *
 * Patterns are deliberately conservative: a missed citation surfaces during
 * drafting review, but a false positive would demand verification of text
 * that isn't a citation and block export for no reason.
 */

import { CitationKind } from './types';

export interface ExtractedCitation {
  citation: string;
  kind: CitationKind;
}

interface PatternSpec {
  kind: CitationKind;
  re: RegExp;
  /** Normalize the raw match to a canonical display string. */
  normalize: (m: RegExpMatchArray) => string;
}

/** Section-number character classes can swallow a sentence-ending period
 *  ("10:3-505." for "10:3-505") — strip trailing dots from captures. */
const clean = (s: string) => s.replace(/\.+$/, '');

const PATTERNS: PatternSpec[] = [
  {
    // 15 U.S.C. § 1691(d)   |   28 U.S.C. §§ 1441, 1446 (first section captured)
    kind: 'statute',
    re: /\b(\d+)\s+U\.?\s?S\.?\s?C\.?\s*§{1,2}\s*([\dA-Za-z.\-]+(?:\([\dA-Za-z]+\))*)/g,
    normalize: (m) => `${m[1]} U.S.C. § ${clean(m[2]!)}`,
  },
  {
    // 31 C.F.R. § 1020.220   |   12 C.F.R. 1026
    kind: 'regulation',
    re: /\b(\d+)\s+C\.?\s?F\.?\s?R\.?\s*§{0,2}\s*([\d.]+[\dA-Za-z()\-]*)/g,
    normalize: (m) => `${m[1]} C.F.R. § ${clean(m[2]!)}`,
  },
  {
    // Fed. R. Civ. P. 17(a)(3)  |  FRCP 12(b)(6)
    kind: 'rule',
    re: /\b(?:Fed\.?\s*R\.?\s*Civ\.?\s*P\.?|FRCP)\s*(\d+(?:\.\d+)?(?:\([\dA-Za-z]+\))*)/g,
    normalize: (m) => `Fed. R. Civ. P. ${clean(m[1]!)}`,
  },
  {
    // La. R.S. § 10:3-505  |  La. R.S. 51:1401
    kind: 'statute',
    re: /\bLa\.?\s*R\.?\s*S\.?\s*§{0,2}\s*([\d]+:[\d.\-]+[\dA-Za-z()]*)/g,
    normalize: (m) => `La. R.S. § ${clean(m[1]!)}`,
  },
  {
    // La. Civ. Code art. 2926
    kind: 'statute',
    re: /\bLa\.?\s*Civ\.?\s*Code\s*(?:art(?:icle)?s?\.?)\s*([\d.]+)/gi,
    normalize: (m) => `La. Civ. Code art. ${clean(m[1]!)}`,
  },
];

/** Extract statute/rule/regulation citations from text, deduplicated in order. */
export function extractStatutoryCitations(text: string): ExtractedCitation[] {
  const seen = new Set<string>();
  const out: ExtractedCitation[] = [];
  for (const spec of PATTERNS) {
    for (const m of text.matchAll(spec.re)) {
      const citation = spec.normalize(m);
      if (!seen.has(citation)) {
        seen.add(citation);
        out.push({ citation, kind: spec.kind });
      }
    }
  }
  return out;
}
