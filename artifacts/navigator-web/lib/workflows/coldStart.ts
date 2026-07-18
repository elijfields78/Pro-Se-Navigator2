/**
 * The Cold-Start workflow — nine phases from grievance to filed complaint,
 * each with a non-negotiable artifact gate (Cold-Start spec §2).
 */

import { WorkflowMachine, PhaseDef } from './machine';

export interface ViabilityEntry {
  claim: string;
  status: 'pass' | 'hold' | 'no_go';
  notes?: string;
}

export interface CourtProfile {
  courtName: string;
  division?: string;
  filingMethod: string;
  filingFeeCents?: number;
  localRulesLoaded: boolean;
}

export interface ColdStartArtifacts {
  // Phase 1 — Story Intake
  factNarrative?: string;
  factNarrativeApproved?: boolean;
  // Phase 2 — Evidence Inventory
  evidenceIndexed?: boolean;
  evidenceCount?: number;
  // Phase 3 — Legal Theory Discovery
  selectedTheories?: string[];
  // Phase 4 — Viability Check (computed honestly — never scripted)
  viabilityReport?: ViabilityEntry[];
  // Phase 5 — Pre-Suit Steps
  preSuitRequired?: string[]; // requirements identified for the selected claims
  preSuitCompleted?: string[]; // requirements satisfied and documented
  arbitrationChecked?: boolean;
  // Phase 6 — Court Selection
  courtProfile?: CourtProfile;
  // Phase 7 — Complaint Drafting
  complaintDrafted?: boolean;
  complaintVerified?: boolean; // every citation checked (Layer 2)
  // Phase 8 — Filing Packet
  packetComplete?: boolean;
  // Phase 9 — Service and Docketing
  docketNumber?: string;
  serviceCompleted?: boolean;
  // The commitment gate before Phase 7 (Cold-Start §14.4)
  commitmentConfirmed?: boolean;
}

export const COLD_START_PHASES: ReadonlyArray<PhaseDef<ColdStartArtifacts>> = [
  {
    id: 'story_intake',
    title: 'Story Intake',
    gate: (a) => {
      const missing: string[] = [];
      if (!a.factNarrative) missing.push('A structured fact narrative (who, what, when, where, harm).');
      if (!a.factNarrativeApproved) missing.push('User approval of the fact narrative.');
      return missing;
    },
  },
  {
    id: 'evidence_inventory',
    title: 'Evidence Inventory',
    gate: (a) => (a.evidenceIndexed ? [] : ['A dated evidence index with each item classified.']),
  },
  {
    id: 'legal_theory_discovery',
    title: 'Legal Theory Discovery',
    gate: (a) =>
      a.selectedTheories && a.selectedTheories.length > 0
        ? []
        : ['At least one user-selected claim theory.'],
  },
  {
    id: 'viability_check',
    title: 'Viability Check',
    gate: (a) => {
      if (!a.viabilityReport || a.viabilityReport.length === 0) {
        return ['A viability report (go / hold / no-go) for every selected claim.'];
      }
      const missing: string[] = [];
      for (const t of a.selectedTheories ?? []) {
        if (!a.viabilityReport.some((v) => v.claim === t)) {
          missing.push(`Viability result for "${t}".`);
        }
      }
      // Claims on HOLD must be resolved (fixed or dropped) before advancing.
      const holds = a.viabilityReport.filter(
        (v) => v.status === 'hold' && (a.selectedTheories ?? []).includes(v.claim),
      );
      for (const h of holds) missing.push(`"${h.claim}" is on HOLD — fix or drop it before advancing.`);
      // At least one surviving claim.
      const surviving = a.viabilityReport.some(
        (v) => v.status === 'pass' && (a.selectedTheories ?? []).includes(v.claim),
      );
      if (!surviving) missing.push('At least one claim must PASS viability to proceed.');
      return missing;
    },
  },
  {
    id: 'pre_suit_steps',
    title: 'Pre-Suit Steps',
    gate: (a) => {
      const missing: string[] = [];
      if (!a.arbitrationChecked) missing.push('Arbitration check on every uploaded contract.');
      for (const req of a.preSuitRequired ?? []) {
        if (!(a.preSuitCompleted ?? []).includes(req)) {
          missing.push(`Pre-suit requirement not satisfied: ${req}.`);
        }
      }
      return missing;
    },
  },
  {
    id: 'court_selection',
    title: 'Court Selection',
    gate: (a) => {
      const missing: string[] = [];
      if (!a.courtProfile) missing.push('A named court with filing method identified.');
      else if (!a.courtProfile.localRulesLoaded) missing.push('Local rules loaded for the selected court.');
      // The "do you actually want to do this" gate sits before drafting.
      if (!a.commitmentConfirmed) {
        missing.push('User commitment confirmation (time / cost / realistic damages shown).');
      }
      return missing;
    },
  },
  {
    id: 'complaint_drafting',
    title: 'Complaint Drafting',
    gate: (a) => {
      const missing: string[] = [];
      if (!a.complaintDrafted) missing.push('A drafted complaint.');
      if (!a.complaintVerified) missing.push('Every citation in the complaint verified (hard gate).');
      return missing;
    },
  },
  {
    id: 'filing_packet',
    title: 'Filing Packet',
    gate: (a) => (a.packetComplete ? [] : ['A filing-ready packet with checklist and submission instructions.']),
  },
  {
    id: 'service_and_docketing',
    title: 'Service and Docketing',
    gate: (a) => {
      const missing: string[] = [];
      if (!a.docketNumber) missing.push('Docket number.');
      if (!a.serviceCompleted) missing.push('Service completed.');
      return missing;
    },
  },
];

export function createColdStartMachine(startPhase?: string): WorkflowMachine<ColdStartArtifacts> {
  return new WorkflowMachine(COLD_START_PHASES, startPhase);
}

// ── Handoff to the reactive workflow (Cold-Start §15 — nothing is lost) ────

export interface ReactiveHandoff {
  factNarrative: string;
  evidenceCount: number;
  selectedTheories: string[];
  viabilityReport: ViabilityEntry[];
  preSuitCompleted: string[];
  courtProfile: CourtProfile;
  docketNumber: string;
}

/** Builds the reactive-workflow seed from completed cold-start artifacts.
 *  Throws if anything the handoff table requires is missing. */
export function buildReactiveHandoff(a: ColdStartArtifacts): ReactiveHandoff {
  const missing: string[] = [];
  if (!a.factNarrative) missing.push('factNarrative');
  if (!a.selectedTheories?.length) missing.push('selectedTheories');
  if (!a.viabilityReport?.length) missing.push('viabilityReport');
  if (!a.courtProfile) missing.push('courtProfile');
  if (!a.docketNumber) missing.push('docketNumber');
  if (missing.length > 0) {
    throw new Error(`Cold-start handoff incomplete — missing: ${missing.join(', ')}`);
  }
  return {
    factNarrative: a.factNarrative!,
    evidenceCount: a.evidenceCount ?? 0,
    selectedTheories: a.selectedTheories!,
    viabilityReport: a.viabilityReport!,
    preSuitCompleted: a.preSuitCompleted ?? [],
    courtProfile: a.courtProfile!,
    docketNumber: a.docketNumber!,
  };
}
