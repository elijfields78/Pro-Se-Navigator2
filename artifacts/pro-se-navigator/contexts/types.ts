export type CaseType = 'general' | 'fcra' | 'traffic' | 'ifp';

export interface Case {
  id: string;
  title: string;
  caseType: CaseType;
  court: string;
  judge?: string;
  caseNumber?: string;
  serviceDate?: string;
  createdAt: string;
  lastMessageAt?: string;
  /** Index into the intake script. Equals script.length when intake is complete. */
  intakeTurnIndex: number;
}

export interface NextStep {
  id: string;
  label: string;
  subtitle?: string;
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

export interface User {
  id: string;
  email: string;
  name?: string;
}
