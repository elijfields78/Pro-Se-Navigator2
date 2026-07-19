/**
 * Case persistence + the bridge between database rows and the cold-start
 * FSM. `computeArtifacts` is a pure function (unit-tested) that assembles
 * the gate-input artifacts from what is actually stored — the machine never
 * trusts a client-supplied artifact blob.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ColdStartArtifacts,
  ViabilityEntry,
  createColdStartMachine,
  COLD_START_PHASES,
} from '../workflows/coldStart';

// ── Row shapes (subset of schema.sql we read) ───────────────────────────────

export interface CaseRow {
  id: string;
  title: string;
  workflow: 'cold_start' | 'reactive';
  canonical_caption: string | null;
  signature_block: string | null;
  court_name: string | null;
  court_division: string | null;
  docket_number: string | null;
  filing_method: string | null;
  fact_narrative: string | null;
  fact_narrative_approved: boolean;
}

export interface PhaseStateRow {
  phase: string;
  workflow: 'cold_start' | 'reactive';
  gate_artifacts: Record<string, unknown>;
}

export interface TheoryRow {
  claim_name: string;
  selected: boolean;
  viability: 'untested' | 'pass' | 'hold' | 'no_go';
  viability_notes: string | null;
}

export interface CaseBundle {
  caseRow: CaseRow;
  phase: PhaseStateRow;
  theories: TheoryRow[];
  evidenceCount: number;
  /** What the current phase's gate still needs (empty = can advance). */
  missing: string[];
}

// ── Pure artifact assembly ──────────────────────────────────────────────────

export function computeArtifacts(
  caseRow: CaseRow,
  phase: PhaseStateRow,
  theories: TheoryRow[],
  evidenceCount: number,
): ColdStartArtifacts {
  const g = phase.gate_artifacts ?? {};
  const selected = theories.filter((t) => t.selected).map((t) => t.claim_name);
  const viabilityReport: ViabilityEntry[] = theories
    .filter((t) => t.viability !== 'untested')
    .map((t) => ({
      claim: t.claim_name,
      status: t.viability as ViabilityEntry['status'],
      notes: t.viability_notes ?? undefined,
    }));

  return {
    factNarrative: caseRow.fact_narrative ?? undefined,
    factNarrativeApproved: caseRow.fact_narrative_approved,
    evidenceIndexed: evidenceCount > 0,
    evidenceCount,
    selectedTheories: selected.length > 0 ? selected : undefined,
    viabilityReport: viabilityReport.length > 0 ? viabilityReport : undefined,
    // Phase-5+ artifacts live in the gate_artifacts JSON until their own
    // modules exist; the FSM still enforces them.
    preSuitRequired: (g['preSuitRequired'] as string[]) ?? [],
    preSuitCompleted: (g['preSuitCompleted'] as string[]) ?? [],
    arbitrationChecked: Boolean(g['arbitrationChecked']),
    commitmentConfirmed: Boolean(g['commitmentConfirmed']),
    courtProfile: caseRow.court_name
      ? {
          courtName: caseRow.court_name,
          division: caseRow.court_division ?? undefined,
          filingMethod: caseRow.filing_method ?? 'unknown',
          localRulesLoaded: Boolean(g['localRulesLoaded']),
        }
      : undefined,
    complaintDrafted: Boolean(g['complaintDrafted']),
    complaintVerified: Boolean(g['complaintVerified']),
    packetComplete: Boolean(g['packetComplete']),
    docketNumber: caseRow.docket_number ?? undefined,
    serviceCompleted: Boolean(g['serviceCompleted']),
  };
}

/** Missing gate items for the phase the case is currently in. */
export function missingForPhase(phase: string, artifacts: ColdStartArtifacts): string[] {
  const def = COLD_START_PHASES.find((p) => p.id === phase);
  return def ? def.gate(artifacts) : [];
}

/** Attempt to advance from the stored phase; returns the (possibly new)
 *  phase plus what is still missing when blocked. Pure. */
export function tryAdvance(
  phase: string,
  artifacts: ColdStartArtifacts,
): { advanced: boolean; phase: string; missing: string[]; finished: boolean } {
  const machine = createColdStartMachine(phase);
  const res = machine.advance(artifacts);
  return { advanced: res.ok, phase: machine.current, missing: res.missing, finished: res.finished };
}

// ── Queries ─────────────────────────────────────────────────────────────────

const CASE_COLUMNS =
  'id, title, workflow, canonical_caption, signature_block, court_name, court_division, docket_number, filing_method, fact_narrative, fact_narrative_approved';

export async function createCase(
  db: SupabaseClient,
  userId: string,
  title: string,
): Promise<CaseRow> {
  const { data, error } = await db
    .from('nav_cases')
    .insert({ user_id: userId, title: title.slice(0, 120), workflow: 'cold_start' })
    .select(CASE_COLUMNS)
    .single();
  if (error) throw error;

  const { error: phaseErr } = await db.from('nav_case_phase_state').insert({
    case_id: data.id,
    user_id: userId,
    workflow: 'cold_start',
    phase: 'story_intake',
    gate_artifacts: {},
  });
  if (phaseErr) {
    // A case without phase state is unreadable (getCaseBundle expects exactly
    // one phase row) — clean up rather than leave an orphan.
    await db.from('nav_cases').delete().eq('id', data.id);
    throw phaseErr;
  }
  return data as CaseRow;
}

export async function listCases(
  db: SupabaseClient,
): Promise<Array<Pick<CaseRow, 'id' | 'title' | 'workflow'> & { phase: string }>> {
  const { data, error } = await db
    .from('nav_cases')
    .select('id, title, workflow, nav_case_phase_state(phase)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const ps = row['nav_case_phase_state'] as { phase: string }[] | { phase: string } | null;
    const phase = Array.isArray(ps) ? (ps[0]?.phase ?? 'story_intake') : (ps?.phase ?? 'story_intake');
    return {
      id: row['id'] as string,
      title: row['title'] as string,
      workflow: row['workflow'] as 'cold_start' | 'reactive',
      phase,
    };
  });
}

export async function getCaseBundle(db: SupabaseClient, caseId: string): Promise<CaseBundle> {
  const [caseRes, phaseRes, theoriesRes, evidenceRes] = await Promise.all([
    db.from('nav_cases').select(CASE_COLUMNS).eq('id', caseId).single(),
    db.from('nav_case_phase_state').select('phase, workflow, gate_artifacts').eq('case_id', caseId).single(),
    db.from('nav_legal_theories').select('claim_name, selected, viability, viability_notes').eq('case_id', caseId),
    db.from('nav_evidence_items').select('id', { count: 'exact', head: true }).eq('case_id', caseId).eq('is_missing', false),
  ]);
  if (caseRes.error) throw caseRes.error;
  if (phaseRes.error) throw phaseRes.error;

  const caseRow = caseRes.data as CaseRow;
  const phase = phaseRes.data as PhaseStateRow;
  const theories = (theoriesRes.data ?? []) as TheoryRow[];
  const evidenceCount = evidenceRes.count ?? 0;

  const artifacts = computeArtifacts(caseRow, phase, theories, evidenceCount);
  return { caseRow, phase, theories, evidenceCount, missing: missingForPhase(phase.phase, artifacts) };
}

export async function saveIntakeResult(
  db: SupabaseClient,
  userId: string,
  caseId: string,
  params: { narrative: string; extraction: unknown; questions: string[]; title?: string },
): Promise<void> {
  const updates: Record<string, unknown> = {
    fact_narrative: params.narrative,
    fact_narrative_approved: false,
    updated_at: new Date().toISOString(),
  };
  if (params.title) updates['title'] = params.title;
  const { error } = await db.from('nav_cases').update(updates).eq('id', caseId);
  if (error) throw error;

  const { error: psErr } = await db
    .from('nav_case_phase_state')
    .update({
      gate_artifacts: { intakeExtraction: params.extraction, intakeQuestions: params.questions },
      updated_at: new Date().toISOString(),
    })
    .eq('case_id', caseId);
  if (psErr) throw psErr;

  const { error: evErr } = await db.from('nav_memory_events').insert({
    case_id: caseId,
    user_id: userId,
    kind: 'durable_fact',
    content: 'Story intake completed; fact narrative drafted (pending user approval).',
  });
  if (evErr) throw evErr;
}

export async function approveNarrative(
  db: SupabaseClient,
  userId: string,
  caseId: string,
): Promise<{ phase: string; missing: string[] }> {
  const { error } = await db
    .from('nav_cases')
    .update({ fact_narrative_approved: true, updated_at: new Date().toISOString() })
    .eq('id', caseId);
  if (error) throw error;

  const bundle = await getCaseBundle(db, caseId);
  const artifacts = computeArtifacts(bundle.caseRow, bundle.phase, bundle.theories, bundle.evidenceCount);
  const result = tryAdvance(bundle.phase.phase, artifacts);

  if (result.advanced && !result.finished) {
    const { error: upErr } = await db
      .from('nav_case_phase_state')
      .update({ phase: result.phase, updated_at: new Date().toISOString() })
      .eq('case_id', caseId);
    if (upErr) throw upErr;
    await db.from('nav_memory_events').insert({
      case_id: caseId,
      user_id: userId,
      kind: 'durable_fact',
      content: `Fact narrative approved; case advanced to ${result.phase}.`,
    });
  }
  const missing = missingForPhase(
    result.phase,
    computeArtifacts(bundle.caseRow, { ...bundle.phase, phase: result.phase }, bundle.theories, bundle.evidenceCount),
  );
  return { phase: result.phase, missing };
}
