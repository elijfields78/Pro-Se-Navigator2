/**
 * The Reactive workflow — module registry + inbound-filing router.
 *
 * Built from docs/derived-reactive-blueprint.md (the reconstructed Blueprint,
 * built at the owner's direction; subject to correction if the original
 * Blueprint v1.0 surfaces). The reactive workflow is not a linear pipeline —
 * it is fourteen modules over shared case state, driven by events (an
 * inbound filing, a deadline approaching, a user ask).
 */

export const REACTIVE_MODULES = [
  'filing_intake',
  'docket_ledger',
  'deadline_engine',
  'drafting_studio',
  'response_generator',
  'strategic_analysis',
  'pressure_test_panel',
  'discovery_manager',
  'evidence_exhibit_manager',
  'authority_bank',
  'regulatory_complaint_manager',
  'service_certificates',
  'settlement_tracker',
  'case_memory_timeline',
] as const;
export type ReactiveModule = (typeof REACTIVE_MODULES)[number];

export type InboundFilingKind =
  | 'motion'
  | 'opposition'
  | 'reply'
  | 'order'
  | 'notice'
  | 'discovery_request'
  | 'unknown';

export interface InboundFiling {
  kind: InboundFilingKind;
  title: string;
  filedBy: 'opponent' | 'court';
  /** Days the rules allow for a response, when one is required. */
  responseDays?: number;
}

export interface RoutingDecision {
  /** The module that owns the next action. */
  module: ReactiveModule;
  /** Whether a response deadline must be entered into the deadline engine. */
  createDeadline: boolean;
  /** Suggested next-step chips for the chat surface. */
  chips: string[];
}

/** Deterministic routing of an inbound filing to the owning module. */
export function routeInboundFiling(filing: InboundFiling): RoutingDecision {
  switch (filing.kind) {
    case 'motion':
      return {
        module: 'response_generator',
        createDeadline: true,
        chips: [
          'Draft my opposition',
          'Explain this in plain English',
          "What's my deadline?",
          'Pressure-test their motion',
          'Add to timeline',
        ],
      };
    case 'order':
      return {
        module: 'docket_ledger',
        createDeadline: filing.responseDays !== undefined,
        chips: ['What does this order mean?', 'What do I need to do now?', 'Update my deadlines', 'Add to timeline'],
      };
    case 'discovery_request':
      return {
        module: 'discovery_manager',
        createDeadline: true,
        chips: ['Draft my responses', 'What are they asking for?', "What's my deadline?", 'Object to overbroad requests'],
      };
    case 'opposition':
    case 'reply':
      return {
        module: 'docket_ledger',
        createDeadline: false,
        chips: ['Summarize their argument', 'Do I get to respond?', 'Pressure-test their position', 'Add to timeline'],
      };
    case 'notice':
      return {
        module: 'docket_ledger',
        createDeadline: false,
        chips: ['What does this mean?', 'Add to timeline', 'Update my deadlines'],
      };
    default:
      return {
        module: 'filing_intake',
        createDeadline: false,
        chips: ['Classify this document', 'Explain this in plain English', 'Add to timeline'],
      };
  }
}
