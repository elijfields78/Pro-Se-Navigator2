/**
 * Layer 5 — Guardrails. Seven checks composed into one export gate. The
 * download/share handler is only reachable through `runExportGate`; a
 * document that fails a blocking check cannot ship.
 *
 * Blocking: caption_lock, signature_lock, verification_gate,
 * banned_vocabulary. Advisory (flag + one-click fix): tone_filter,
 * factual_consistency. Automatic: deadline_safety_margin (computed at write
 * time; the check validates it).
 */

import { VerifiedCitation, verificationGate } from '../verification';
import { CaseMemory } from '../memory';

export type GuardrailName =
  | 'caption_lock'
  | 'signature_lock'
  | 'verification_gate'
  | 'tone_filter'
  | 'deadline_safety_margin'
  | 'banned_vocabulary'
  | 'factual_consistency';

export interface GuardrailFinding {
  guardrail: GuardrailName;
  severity: 'blocking' | 'advisory';
  message: string;
  /** Suggested replacement, when a mechanical fix exists. */
  suggestion?: string;
}

export interface FactualAssertion {
  text: string;
  /** Evidence item codes (EV-001) or docket refs (ECF 35) supporting it. */
  refs: string[];
}

export interface DeadlineRecord {
  title: string;
  dueDate: string; // ISO date
  safetyDate: string; // ISO date
  createdAt: string; // ISO date
}

export interface DraftDocument {
  title: string;
  body: string;
  caption?: string;
  signatureBlock?: string;
  factualAssertions?: FactualAssertion[];
}

export interface ExportContext {
  memory: CaseMemory;
  verification: VerifiedCitation[];
  /** Citations the user explicitly confirmed against source text. */
  userConfirmedCitations?: ReadonlySet<string>;
  deadlines?: DeadlineRecord[];
}

// ── Banned vocabulary (from the master prompt — global, non-configurable) ───

/** Never appear in generated output about opposing counsel. */
export const BANNED_ABOUT_COUNSEL: ReadonlyArray<{ term: string; instead: string }> = [
  { term: 'lied', instead: 'the record demonstrates otherwise' },
  { term: 'knowingly misrepresented', instead: "Defendant's position appears to be inconsistent with the record" },
  { term: 'deceived', instead: 'the record demonstrates' },
  { term: 'bully', instead: 'with respect' },
  { term: 'fraud', instead: "Defendant's position appears to be unsupported by the record" },
];

/** Sovereign-citizen vocabulary — blocked everywhere, no exceptions. */
export const BANNED_SOVEREIGN: ReadonlyArray<string> = [
  'natural person',
  'administrative default',
  'tacit agreement by silence',
  'indentured trustee',
  'silent dishonor',
];

function containsTerm(body: string, term: string): boolean {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body);
}

// ── The seven checks ────────────────────────────────────────────────────────

export function checkCaptionLock(doc: DraftDocument, ctx: ExportContext): GuardrailFinding[] {
  const canonical = ctx.memory.canonicalCaption;
  if (!canonical) {
    return [{ guardrail: 'caption_lock', severity: 'blocking', message: 'No canonical caption is set for this case. Set it before exporting.' }];
  }
  if (doc.caption !== undefined && doc.caption !== canonical) {
    return [{ guardrail: 'caption_lock', severity: 'blocking', message: 'Document caption does not match the canonical caption.', suggestion: canonical }];
  }
  return [];
}

export function checkSignatureLock(doc: DraftDocument, ctx: ExportContext): GuardrailFinding[] {
  const canonical = ctx.memory.signatureBlock;
  if (!canonical) {
    return [{ guardrail: 'signature_lock', severity: 'blocking', message: 'No canonical signature block is set for this case. Set it before exporting.' }];
  }
  if (doc.signatureBlock !== undefined && doc.signatureBlock !== canonical) {
    return [{ guardrail: 'signature_lock', severity: 'blocking', message: 'Signature block does not match the canonical signature block.', suggestion: canonical }];
  }
  return [];
}

export function checkVerification(_doc: DraftDocument, ctx: ExportContext): GuardrailFinding[] {
  const gate = verificationGate(ctx.verification, ctx.userConfirmedCitations ?? new Set());
  return gate.blockers.map((message) => ({
    guardrail: 'verification_gate' as const,
    severity: 'blocking' as const,
    message,
  }));
}

export function checkTone(doc: DraftDocument, ctx: ExportContext): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  const rules = ctx.memory.toneProfile.rules;
  if (rules['no_exclamations'] && doc.body.includes('!')) {
    findings.push({
      guardrail: 'tone_filter',
      severity: 'advisory',
      message: 'Tone profile forbids exclamation points; the draft contains at least one.',
      suggestion: doc.body.replaceAll('!', '.'),
    });
  }
  for (const extra of ctx.memory.toneProfile.bannedExtra) {
    if (containsTerm(doc.body, extra)) {
      findings.push({
        guardrail: 'tone_filter',
        severity: 'advisory',
        message: `Tone profile bans the phrase "${extra}".`,
      });
    }
  }
  return findings;
}

/** safety = due − 20% of the (created → due) interval, floored to a full day
 *  earlier whenever the interval is at least a day. */
export function computeSafetyDate(createdAt: string, dueDate: string): string {
  const created = new Date(createdAt + (createdAt.length === 10 ? 'T00:00:00Z' : ''));
  const due = new Date(dueDate + (dueDate.length === 10 ? 'T00:00:00Z' : ''));
  const intervalMs = due.getTime() - created.getTime();
  if (intervalMs <= 0) return dueDate.slice(0, 10);
  const dayMs = 86_400_000;
  const marginMs = Math.max(intervalMs >= dayMs ? dayMs : 0, Math.floor(intervalMs * 0.2));
  return new Date(due.getTime() - marginMs).toISOString().slice(0, 10);
}

export function checkDeadlineSafetyMargin(_doc: DraftDocument, ctx: ExportContext): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  for (const d of ctx.deadlines ?? []) {
    const expected = computeSafetyDate(d.createdAt, d.dueDate);
    if (d.safetyDate > expected) {
      findings.push({
        guardrail: 'deadline_safety_margin',
        severity: 'blocking',
        message: `Deadline "${d.title}" has a safety date (${d.safetyDate}) later than the required 20% margin (${expected}).`,
        suggestion: expected,
      });
    }
  }
  return findings;
}

export function checkBannedVocabulary(doc: DraftDocument, _ctx: ExportContext): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  for (const { term, instead } of BANNED_ABOUT_COUNSEL) {
    if (containsTerm(doc.body, term)) {
      findings.push({
        guardrail: 'banned_vocabulary',
        severity: 'blocking',
        message: `Banned term "${term}" — use record-based framing instead.`,
        suggestion: instead,
      });
    }
  }
  for (const term of BANNED_SOVEREIGN) {
    if (containsTerm(doc.body, term)) {
      findings.push({
        guardrail: 'banned_vocabulary',
        severity: 'blocking',
        message: `Sovereign-citizen vocabulary "${term}" is blocked in all output.`,
      });
    }
  }
  return findings;
}

export function checkFactualConsistency(doc: DraftDocument, _ctx: ExportContext): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  for (const assertion of doc.factualAssertions ?? []) {
    if (assertion.refs.length === 0) {
      findings.push({
        guardrail: 'factual_consistency',
        severity: 'advisory',
        message: `Factual assertion has no supporting reference (evidence item or docket entry): "${assertion.text.slice(0, 80)}"`,
      });
    }
  }
  return findings;
}

// ── The export gate ─────────────────────────────────────────────────────────

export interface ExportGateResult {
  /** True when no blocking findings — the document may ship. */
  pass: boolean;
  findings: GuardrailFinding[];
}

export function runExportGate(doc: DraftDocument, ctx: ExportContext): ExportGateResult {
  const findings = [
    ...checkCaptionLock(doc, ctx),
    ...checkSignatureLock(doc, ctx),
    ...checkVerification(doc, ctx),
    ...checkTone(doc, ctx),
    ...checkDeadlineSafetyMargin(doc, ctx),
    ...checkBannedVocabulary(doc, ctx),
    ...checkFactualConsistency(doc, ctx),
  ];
  return { pass: !findings.some((f) => f.severity === 'blocking'), findings };
}
