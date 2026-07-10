export type CaseType = 'general' | 'fcra' | 'traffic' | 'ifp';

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
  /**
   * When a NextStep has a followUpPrompt, we pause normal intake progression
   * and ask the follow-up. The next user message resolves it and resumes at resumeTurnIndex.
   */
  pendingFollowUp?: {
    prompt: string;
    resumeTurnIndex: number;
  };
}

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
}

export interface Message {
  id: string;
  caseId: string;
  role: 'navigator' | 'user';
  content: string;
  nextSteps?: NextStep[];
  createdAt: string;
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

export interface User {
  id: string;
  email: string;
  name?: string;
}
