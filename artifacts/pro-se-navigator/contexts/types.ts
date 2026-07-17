export type CaseType = 'general' | 'fcra' | 'traffic' | 'ifp';

export interface NextStep {
  id: string;
  label: string;
  subtitle?: string;
  /**
   * If set, tapping this option shows this text as a navigator follow-up
   * question instead of immediately advancing to the next intake turn.
   * The user's free-text reply then resumes intake at the next turn.
   */
  followUpPrompt?: string;
  /**
   * When a followUpPrompt is set, these nextSteps are attached to the
   * follow-up navigator message (e.g. document-type options).
   */
  followUpNextSteps?: NextStep[];
  /**
   * Special action to perform when this step is selected.
   * 'create_draft' → creates a stub artifact and triggers the deadline flow.
   */
  action?: 'create_draft';
  /** Payload for the action */
  actionData?: { title: string; kind: string };
}

export interface Message {
  id: string;
  caseId: string;
  role: 'navigator' | 'user';
  content: string;
  nextSteps?: NextStep[];
  createdAt: string;
}

// ── Pending follow-up discriminated union ────────────────────────────────────

/**
 * Intake follow-up: pauses intake and asks a clarifying question.
 * The user's next free-text reply resumes at resumeTurnIndex.
 */
export interface PendingIntakeFollowUp {
  kind: 'intake_follow_up';
  prompt: string;
  resumeTurnIndex: number;
}

/**
 * Deadline date entry: the Navigator has posted an estimate and is waiting
 * for the user to provide the real trigger date so the app can compute the
 * exact deadline deterministically via Rule 6.
 */
export interface PendingDeadlineEntry {
  kind: 'deadline_date_entry';
  artifactId: string;
  artifactTitle: string;
  estimatedDays: number;
  ruleBasis: string;
  description: string;
  triggerDateLabel: string;
  reasoning: string;
}

export type PendingFollowUp = PendingIntakeFollowUp | PendingDeadlineEntry;

export interface Case {
  id: string;
  title: string;
  caseType: CaseType;
  /** Discovered through intake chat, not entered manually */
  court?: string;
  judge?: string;
  caseNumber?: string;
  serviceDate?: string;
  createdAt: string;
  lastMessageAt?: string;
  /** Index into the intake script. Equals script.length when intake is complete. */
  intakeTurnIndex: number;
  pendingFollowUp?: PendingFollowUp;
}

export interface VerifiedAuthority {
  id: string;
  caseId: string;
  caseTitle: string;
  citation: string;
  verifiedStatus: 'verified' | 'pending' | 'failed';
  url?: string;
  quote?: string;
  createdAt: string;
}

export interface Deadline {
  id: string;
  caseId: string;
  caseTitle: string;
  description: string;
  dueDate: string;
  ruleBasis: string;
  source?: string;
  createdAt: string;
}

export type ArtifactKind = 'motion' | 'letter' | 'form' | 'note' | 'other';

export interface CaseArtifact {
  id: string;
  caseId: string;
  caseTitle: string;
  title: string;
  /** Full document text */
  content: string;
  kind: ArtifactKind;
  createdAt: string;
}

/** Source of an uploaded document, mirrored from the attachment picker. */
export type DocumentSource = 'image' | 'camera' | 'file';

export interface CaseDocument {
  id: string;
  caseId: string;
  caseTitle: string;
  /** Original file name shown to the user. */
  name: string;
  /** Path within the private `case-documents` Storage bucket. */
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  source: DocumentSource;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}
