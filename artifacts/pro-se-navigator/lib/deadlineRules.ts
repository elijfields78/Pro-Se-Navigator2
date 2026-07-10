/**
 * Deadline rule lookup engine.
 *
 * Given an artifact title and kind, returns the most likely deadline rule
 * based on keyword matching. This is deterministic — no AI involved.
 *
 * The AI (Phase 6) will eventually produce richer context; this module
 * provides sensible defaults so the deadline flow works immediately.
 */

import { ArtifactKind } from '@/contexts/types';

export interface DeadlineRule {
  /** Estimated number of days in the period */
  estimatedDays: number;
  /** Short label for the deadline (stored in the Deadline record) */
  description: string;
  /** Rule citation shown on the deadline card */
  ruleBasis: string;
  /** Human-readable label for the date the user needs to enter */
  triggerDateLabel: string;
  /**
   * Plain-language reasoning shown in the estimate Navigator message.
   * Must make clear this is an estimate, not a confirmed fact.
   */
  reasoning: string;
}

// ── Keyword-based rules (checked in order; first match wins) ─────────────────
const KEYWORD_RULES: Array<{ keywords: string[]; rule: DeadlineRule }> = [
  {
    keywords: ["defendant's answer", 'answer to complaint', 'verified answer'],
    rule: {
      estimatedDays: 21,
      description: "Defendant's answer to complaint",
      ruleBasis: 'Fed. R. Civ. P. 12(a)(1)(A)(i)',
      triggerDateLabel: 'date you were served with the complaint',
      reasoning:
        'Based on this being a defendant\'s answer, the deadline is typically 21 days from the date you were served — but I need the actual service date to calculate it exactly.',
    },
  },
  {
    keywords: ['verified complaint', 'complaint'],
    rule: {
      estimatedDays: 21,
      description: "Deadline for defendant to answer the complaint",
      ruleBasis: 'Fed. R. Civ. P. 12(a)(1)(A)(i)',
      triggerDateLabel: 'date the defendant was served',
      reasoning:
        'Based on this being a complaint, the defendant typically has 21 days from service to file an answer — but I need the service date to calculate the exact deadline.',
    },
  },
  {
    keywords: ['motion to dismiss', 'rule 12', '12(b)'],
    rule: {
      estimatedDays: 14,
      description: 'Opposition to motion to dismiss',
      ruleBasis: 'Fed. R. Civ. P. 12(a)(4); check local rules',
      triggerDateLabel: 'date the motion was filed',
      reasoning:
        'Based on this being a motion to dismiss, the opposing party typically has 14 days to file a response — but this varies by court. I need the filing date to calculate it exactly.',
    },
  },
  {
    keywords: ['motion for summary judgment', 'summary judgment'],
    rule: {
      estimatedDays: 21,
      description: 'Opposition to motion for summary judgment',
      ruleBasis: 'Fed. R. Civ. P. 56(c)(1); check local rules',
      triggerDateLabel: 'date the motion was filed',
      reasoning:
        'Oppositions to summary judgment motions are typically due 21 days after the motion is filed — but local rules vary. I need the filing date to calculate it exactly.',
    },
  },
  {
    keywords: ['notice of appeal'],
    rule: {
      estimatedDays: 30,
      description: 'Notice of appeal deadline',
      ruleBasis: 'Fed. R. App. P. 4(a)(1)(A)',
      triggerDateLabel: 'date of the judgment or order being appealed',
      reasoning:
        'The deadline to file a notice of appeal is typically 30 days from the entry of judgment — but I need the judgment date to calculate it exactly.',
    },
  },
  {
    keywords: ['dispute letter', 'fcra', 'credit report', 'credit dispute'],
    rule: {
      estimatedDays: 30,
      description: 'Response deadline for credit dispute',
      ruleBasis: 'FCRA § 611 (15 U.S.C. § 1681i)',
      triggerDateLabel: 'date the letter was sent or delivered',
      reasoning:
        'Under the FCRA, credit bureaus have 30 days to investigate and respond to a dispute — but I need the send date to calculate the exact deadline.',
    },
  },
  {
    keywords: ['demand letter', 'cease and desist', 'letter'],
    rule: {
      estimatedDays: 30,
      description: 'Response deadline for demand letter',
      ruleBasis: 'General practice; varies by claim type',
      triggerDateLabel: 'date the letter was sent',
      reasoning:
        'Demand letters typically expect a response within 30 days, though this isn\'t set by a single rule. I need the send date to calculate it exactly.',
    },
  },
  {
    keywords: ['motion'],
    rule: {
      estimatedDays: 14,
      description: 'Deadline to respond to motion',
      ruleBasis: 'Local Rules (varies by court)',
      triggerDateLabel: 'date the motion was filed',
      reasoning:
        'Motions typically trigger a 14-day response window, but local rules vary significantly. I need the filing date to calculate it exactly.',
    },
  },
];

// ── Fallbacks by artifact kind ───────────────────────────────────────────────
const KIND_FALLBACKS: Record<ArtifactKind, DeadlineRule> = {
  motion: {
    estimatedDays: 14,
    description: 'Deadline related to this motion',
    ruleBasis: 'Local Rules (varies by court)',
    triggerDateLabel: 'relevant filing or service date',
    reasoning:
      'Motions typically trigger a 14-day response window, but this varies by court. I need the relevant date to calculate it exactly.',
  },
  letter: {
    estimatedDays: 30,
    description: 'Response deadline for this letter',
    ruleBasis: 'Varies by claim type',
    triggerDateLabel: 'date the letter was sent or received',
    reasoning:
      'Letters to opposing parties or agencies often have a 30-day response window, depending on the type of claim. I need the relevant date to calculate it exactly.',
  },
  form: {
    estimatedDays: 21,
    description: 'Filing deadline for this form',
    ruleBasis: 'Court rules (varies)',
    triggerDateLabel: 'relevant trigger date',
    reasoning:
      'Court forms often have a 21-day window depending on the type of proceeding. I need the relevant date to calculate the exact deadline.',
  },
  note: {
    estimatedDays: 21,
    description: 'Deadline related to this document',
    ruleBasis: 'Court rules (varies)',
    triggerDateLabel: 'relevant date',
    reasoning:
      'I need the relevant trigger date to calculate the deadline for this document.',
  },
  other: {
    estimatedDays: 21,
    description: 'Deadline related to this document',
    ruleBasis: 'Court rules (varies)',
    triggerDateLabel: 'relevant date',
    reasoning:
      'I need the relevant trigger date to calculate the deadline for this document.',
  },
};

/** Look up the most likely deadline rule for an artifact. */
export function lookupDeadlineRule(
  artifactTitle: string,
  artifactKind: ArtifactKind,
): DeadlineRule {
  const titleLower = artifactTitle.toLowerCase();
  for (const { keywords, rule } of KEYWORD_RULES) {
    if (keywords.some((kw) => titleLower.includes(kw))) {
      return rule;
    }
  }
  return KIND_FALLBACKS[artifactKind];
}
