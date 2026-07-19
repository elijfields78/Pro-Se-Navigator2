import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import {
  Case,
  CaseType,
  Message,
  Deadline,
  VerifiedAuthority,
  CaseArtifact,
  CaseDocument,
  ArtifactKind,
  PendingDeadlineEntry,
  PendingIntakeFollowUp,
} from './types';
import { useAuth } from './AuthContext';
import {
  uploadCaseDocument,
  listUserDocuments,
  deleteCaseDocument,
  getDocumentSignedUrl,
  DocumentUploadInput,
} from '@/lib/documents';
import intakeScripts, {
  WRAP_UP_MESSAGE,
  WRAP_UP_NEXT_STEPS,
  POST_INTAKE_RESPONSE,
  POST_INTAKE_NEXT_STEPS,
} from '@/data/intakeScripts';
import { generateCaseTitle } from '@/utils/autoTitle';
import { lookupDeadlineRule } from '@/lib/deadlineRules';
import {
  computeRule6Deadline,
  formatDeadlineDate,
  parseUserDate,
} from '@/lib/rule6';

// ── ID generator ────────────────────────────────────────────────────────────
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ── DB ↔ App type mappers ───────────────────────────────────────────────────
function dbToCase(row: Record<string, any>): Case {
  let pendingFollowUp = row.pending_follow_up ?? undefined;
  // Migrate old pendingFollowUp data that predates the discriminated union.
  // Old shape: { prompt: string; resumeTurnIndex: number } (no kind field).
  if (pendingFollowUp && !pendingFollowUp.kind && 'prompt' in pendingFollowUp) {
    pendingFollowUp = { ...pendingFollowUp, kind: 'intake_follow_up' } as PendingIntakeFollowUp;
  }
  return {
    id: row.id,
    title: row.title ?? '',
    caseType: row.case_type,
    court: row.court,
    judge: row.judge,
    caseNumber: row.case_number,
    serviceDate: row.service_date,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
    intakeTurnIndex: row.intake_turn_index ?? 0,
    pendingFollowUp,
  };
}

function caseToDb(c: Case, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    title: c.title,
    case_type: c.caseType,
    court: c.court ?? null,
    judge: c.judge ?? null,
    case_number: c.caseNumber ?? null,
    service_date: c.serviceDate ?? null,
    created_at: c.createdAt,
    last_message_at: c.lastMessageAt ?? null,
    intake_turn_index: c.intakeTurnIndex,
    pending_follow_up: c.pendingFollowUp ?? null,
  };
}

function dbToMessage(row: Record<string, any>): Message {
  return {
    id: row.id,
    caseId: row.case_id,
    role: row.role,
    content: row.content,
    nextSteps: row.next_steps ?? undefined,
    createdAt: row.created_at,
  };
}

function messageToDb(m: Message, userId: string) {
  return {
    id: m.id,
    case_id: m.caseId,
    user_id: userId,
    role: m.role,
    content: m.content,
    next_steps: m.nextSteps ?? null,
    created_at: m.createdAt,
  };
}

function dbToDeadline(row: Record<string, any>): Deadline {
  return {
    id: row.id,
    caseId: row.case_id,
    caseTitle: row.case_title ?? '',
    description: row.description,
    dueDate: row.due_date,
    ruleBasis: row.rule_basis,
    source: row.source,
    createdAt: row.created_at,
  };
}

function dbToSource(row: Record<string, any>): VerifiedAuthority {
  return {
    id: row.id,
    caseId: row.case_id,
    caseTitle: row.case_title ?? '',
    citation: row.citation,
    verifiedStatus: row.verified_status,
    url: row.url,
    quote: row.quote,
    createdAt: row.created_at,
  };
}

function dbToArtifact(row: Record<string, any>): CaseArtifact {
  return {
    id: row.id,
    caseId: row.case_id,
    caseTitle: row.case_title ?? '',
    title: row.title,
    content: row.content,
    kind: row.kind,
    createdAt: row.created_at,
  };
}

// ── Context types ────────────────────────────────────────────────────────────
/** Input shape for createCase — title is optional; will be auto-generated from intake. */
export interface CreateCaseInput {
  caseType: CaseType;
  title?: string;
}

interface CasesContextType {
  cases: Case[];
  messages: Record<string, Message[]>;
  deadlines: Deadline[];
  sources: VerifiedAuthority[];
  artifacts: CaseArtifact[];
  documents: CaseDocument[];
  activeCaseId: string | null;
  isLoading: boolean;
  /** Re-runs the full data load for the current user (used by pull-to-refresh). */
  refresh: () => Promise<void>;
  createCase: (data: CreateCaseInput) => Promise<Case>;
  deleteCase: (id: string) => Promise<void>;
  updateCaseTitle: (id: string, title: string) => Promise<void>;
  sendMessage: (caseId: string, content: string) => Promise<void>;
  setActiveCase: (id: string | null) => void;
  getCaseMessages: (caseId: string) => Message[];
  addDeadline: (deadline: Omit<Deadline, 'id' | 'createdAt'>) => Promise<void>;
  addSource: (source: Omit<VerifiedAuthority, 'id' | 'createdAt'>) => Promise<void>;
  /** Creates an artifact and — for non-note kinds — posts a deadline estimate
   *  in the chat and sets pendingFollowUp so the user can enter the trigger date. */
  addArtifact: (artifact: Omit<CaseArtifact, 'id' | 'createdAt'>) => Promise<void>;
  deleteArtifact: (id: string) => Promise<void>;
  /** Called from DeadlineDateEntry once the user has entered the trigger date.
   *  Computes the Rule 6 deadline, saves it, and posts a confirmation message. */
  submitDeadlineTriggerDate: (caseId: string, triggerDateStr: string) => Promise<void>;
  /** Uploads a picked file to Storage and records it against the case. */
  uploadDocument: (caseId: string, input: DocumentUploadInput) => Promise<CaseDocument>;
  deleteDocument: (id: string) => Promise<void>;
  /** Returns a short-lived signed URL for viewing/downloading a document. */
  getDocumentUrl: (id: string) => Promise<string>;
  /** Documents for a specific case. */
  getCaseDocuments: (caseId: string) => CaseDocument[];
}

const CasesContext = createContext<CasesContextType | null>(null);

export function CasesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cases, setCases]                    = useState<Case[]>([]);
  const [messages, setMessages]              = useState<Record<string, Message[]>>({});
  const [deadlines, setDeadlines]            = useState<Deadline[]>([]);
  const [sources, setSources]                = useState<VerifiedAuthority[]>([]);
  const [artifacts, setArtifacts]            = useState<CaseArtifact[]>([]);
  const [documents, setDocuments]            = useState<CaseDocument[]>([]);
  const [activeCaseId, setActiveCaseIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading]            = useState(true);

  // Monotonic load epoch: a completion whose epoch is stale (sign-out or a
  // newer load started meanwhile) must NOT write state. Without this, signing
  // out during an in-flight load repopulated the previous user's data after
  // the clear — visible on a shared device.
  const loadEpoch = useRef(0);

  // ── Load all data when user changes ───────────────────────────────────────
  useEffect(() => {
    if (!user) {
      loadEpoch.current += 1; // invalidate any in-flight load
      setCases([]);
      setMessages({});
      setDeadlines([]);
      setSources([]);
      setArtifacts([]);
      setDocuments([]);
      setActiveCaseIdState(null);
      setIsLoading(false);
      return;
    }
    loadAll(user.id);
  }, [user]);

  const loadAll = useCallback(async (uid: string, opts: { silent?: boolean } = {}) => {
    const epoch = ++loadEpoch.current;
    // silent: keep isLoading untouched so pull-to-refresh doesn't swap the
    // whole screen for a spinner — the RefreshControl is the only indicator.
    if (!opts.silent) setIsLoading(true);
    try {
      const [casesRes, messagesRes, deadlinesRes, sourcesRes, artifactsRes] = await Promise.all([
        supabase.from('cases').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('messages').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('deadlines').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('verified_authorities').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('artifacts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);

      if (casesRes.error) throw casesRes.error;
      if (messagesRes.error) throw messagesRes.error;
      if (deadlinesRes.error) throw deadlinesRes.error;
      if (sourcesRes.error) throw sourcesRes.error;
      if (artifactsRes.error) throw artifactsRes.error;

      // Stale completion (signed out / superseded by a newer load): drop it.
      if (epoch !== loadEpoch.current) return;

      const loadedCases = (casesRes.data ?? []).map(dbToCase);

      // Group messages by caseId
      const msgMap: Record<string, Message[]> = {};
      for (const row of messagesRes.data ?? []) {
        const msg = dbToMessage(row);
        if (!msgMap[msg.caseId]) msgMap[msg.caseId] = [];
        msgMap[msg.caseId].push(msg);
      }

      setCases(loadedCases);
      setMessages(msgMap);
      setDeadlines((deadlinesRes.data ?? []).map(dbToDeadline));
      setSources((sourcesRes.data ?? []).map(dbToSource));
      setArtifacts((artifactsRes.data ?? []).map(dbToArtifact));
    } catch (err) {
      console.error('[CasesContext] loadAll error:', err);
    } finally {
      if (!opts.silent && epoch === loadEpoch.current) setIsLoading(false);
    }

    // Documents load separately and defensively: the documents table/bucket
    // (migration 004) may not be applied in every environment yet, and a
    // failure here must not block the core case data above.
    try {
      const docs = await listUserDocuments(uid);
      if (epoch === loadEpoch.current) setDocuments(docs);
    } catch (err) {
      console.warn('[CasesContext] documents load skipped:', err);
    }
  }, []);

  // ── refresh (pull-to-refresh) ───────────────────────────────────────────────
  // Re-runs the same full load used on mount, silently: the list stays mounted
  // and the native RefreshControl spinner is the only loading indicator.
  const refresh = useCallback(async () => {
    if (!user) return;
    await loadAll(user.id, { silent: true });
  }, [user, loadAll]);

  // ── createCase ────────────────────────────────────────────────────────────
  const createCase = useCallback(
    async (data: CreateCaseInput): Promise<Case> => {
      if (!user) throw new Error('Not authenticated');

      const newCase: Case = {
        id: genId(),
        title: data.title?.trim() || '',
        caseType: data.caseType,
        createdAt: new Date().toISOString(),
        intakeTurnIndex: 0,
      };

      const script = intakeScripts[newCase.caseType];
      const firstTurn = script[0];
      const openingMessage: Message = {
        id: genId(),
        caseId: newCase.id,
        role: 'navigator',
        content: firstTurn.message,
        nextSteps: firstTurn.nextSteps,
        createdAt: new Date().toISOString(),
      };

      // Persist to Supabase first so optimistic state reflects a committed record
      const { error: caseErr } = await supabase
        .from('cases')
        .insert(caseToDb(newCase, user.id));
      if (caseErr) throw new Error(`Failed to create case: ${caseErr.message}`);

      const { error: msgErr } = await supabase
        .from('messages')
        .insert(messageToDb(openingMessage, user.id));
      if (msgErr) {
        // Case was created — clean up to avoid orphan
        await supabase.from('cases').delete().eq('id', newCase.id);
        throw new Error(`Failed to create opening message: ${msgErr.message}`);
      }

      // Update state only after successful DB writes
      setCases((prev) => [newCase, ...prev]);
      setMessages((prev) => ({ ...prev, [newCase.id]: [openingMessage] }));
      setActiveCaseIdState(newCase.id);

      return newCase;
    },
    [user],
  );

  // ── addArtifact ───────────────────────────────────────────────────────────
  /**
   * Saves an artifact to DB.
   * For non-note artifacts: posts a deadline estimate navigator message in the
   * chat and sets pendingFollowUp so the DeadlineDateEntry widget appears.
   * For notes: no deadline flow is triggered.
   */
  const addArtifact = useCallback(
    async (data: Omit<CaseArtifact, 'id' | 'createdAt'>): Promise<void> => {
      if (!user) return;

      const artifact: CaseArtifact = {
        ...data,
        id: genId(),
        createdAt: new Date().toISOString(),
      };

      // Optimistic artifact state
      setArtifacts((prev) => [artifact, ...prev]);

      // Persist artifact
      const { error: artErr } = await supabase.from('artifacts').insert({
        id: artifact.id,
        case_id: artifact.caseId,
        user_id: user.id,
        case_title: artifact.caseTitle,
        title: artifact.title,
        content: artifact.content,
        kind: artifact.kind,
        created_at: artifact.createdAt,
      });

      if (artErr) {
        console.error('[addArtifact] insert:', artErr);
        // Rollback artifact
        setArtifacts((prev) => prev.filter((a) => a.id !== artifact.id));
        return;
      }

      // Notes don't warrant deadline tracking
      if (artifact.kind === 'note') return;

      // ── Deadline estimation flow ──────────────────────────────────────────
      const rule = lookupDeadlineRule(artifact.title, artifact.kind);

      const estimateMsg: Message = {
        id: genId(),
        caseId: data.caseId,
        role: 'navigator',
        content: [
          `I've saved "${artifact.title}" to your Artifacts tab.`,
          ``,
          `${rule.reasoning}`,
          ``,
          `To calculate the exact deadline, I need the ${rule.triggerDateLabel}. Enter it below and I'll run the numbers using Federal Rule 6 — accounting for weekends and federal holidays.`,
        ].join('\n'),
        createdAt: new Date(Date.now() + 10).toISOString(),
      };

      const pendingDeadline: PendingDeadlineEntry = {
        kind: 'deadline_date_entry',
        artifactId: artifact.id,
        artifactTitle: artifact.title,
        estimatedDays: rule.estimatedDays,
        ruleBasis: rule.ruleBasis,
        description: rule.description,
        triggerDateLabel: rule.triggerDateLabel,
        reasoning: rule.reasoning,
      };

      // Optimistic state — use functional setters so we always operate on latest
      setMessages((prev) => ({
        ...prev,
        [data.caseId]: [...(prev[data.caseId] ?? []), estimateMsg],
      }));
      setCases((prev) =>
        prev.map((c) =>
          c.id === data.caseId
            ? { ...c, pendingFollowUp: pendingDeadline, lastMessageAt: estimateMsg.createdAt }
            : c,
        ),
      );

      // Persist estimate message + case pending_follow_up.
      // If either write fails, roll back the optimistic pending state so that
      // an app restart won't show a stale deadline-entry widget with no DB backing.
      const [msgRes, caseRes] = await Promise.all([
        supabase.from('messages').insert(messageToDb(estimateMsg, user.id)),
        supabase.from('cases').update({
          pending_follow_up: pendingDeadline,
          last_message_at: estimateMsg.createdAt,
        }).eq('id', data.caseId),
      ]);

      if (msgRes.error || caseRes.error) {
        const err = msgRes.error ?? caseRes.error;
        console.error('[addArtifact] estimate persist failed — rolling back pending state:', err);
        // Remove the optimistic estimate message and pending entry so the UI
        // doesn't show a deadline widget that won't survive a reload.
        setMessages((prev) => ({
          ...prev,
          [data.caseId]: (prev[data.caseId] ?? []).filter((m) => m.id !== estimateMsg.id),
        }));
        setCases((prev) =>
          prev.map((c) =>
            c.id === data.caseId ? { ...c, pendingFollowUp: undefined } : c,
          ),
        );
      }
    },
    [user],
  );

  // ── submitDeadlineTriggerDate ──────────────────────────────────────────────
  /**
   * Called from DeadlineDateEntry once the user has supplied the trigger date.
   * Computes the Rule 6 deadline, writes it to the deadlines table, posts a
   * user message echoing the date and a confirmation navigator message, then
   * clears pendingFollowUp on the case.
   *
   * Throws with a user-visible message on validation failure (e.g. bad date).
   */
  const submitDeadlineTriggerDate = useCallback(
    async (caseId: string, triggerDateStr: string): Promise<void> => {
      if (!user) return;

      const targetCase = cases.find((c) => c.id === caseId);
      if (!targetCase) return;

      const pf = targetCase.pendingFollowUp;
      if (!pf || pf.kind !== 'deadline_date_entry') return;

      // ── Parse & validate ──────────────────────────────────────────────────
      const triggerDate = parseUserDate(triggerDateStr);
      if (!triggerDate) {
        throw new Error('Invalid date format. Please use MM/DD/YYYY — for example: 07/15/2025');
      }

      // ── Compute deadline ──────────────────────────────────────────────────
      const dueDate     = computeRule6Deadline(triggerDate, pf.estimatedDays);
      const formattedDue = formatDeadlineDate(dueDate);

      // ── Create deadline record ────────────────────────────────────────────
      const deadline: Deadline = {
        id: genId(),
        caseId,
        caseTitle: targetCase.title,
        description: pf.description,
        dueDate,
        ruleBasis: pf.ruleBasis,
        source: `"${pf.artifactTitle}" — ${pf.triggerDateLabel}: ${triggerDateStr}`,
        createdAt: new Date().toISOString(),
      };

      // Persist the deadline FIRST — if this fails we surface the error to the
      // user so DeadlineDateEntry can stay active (pending state untouched).
      const { error: deadlineErr } = await supabase.from('deadlines').insert({
        id: deadline.id,
        case_id: caseId,
        user_id: user.id,
        case_title: deadline.caseTitle,
        description: deadline.description,
        due_date: deadline.dueDate,
        rule_basis: deadline.ruleBasis,
        source: deadline.source ?? null,
        created_at: deadline.createdAt,
      });
      if (deadlineErr) {
        console.error('[submitDeadlineTriggerDate] deadline insert:', deadlineErr);
        throw new Error('Could not save the deadline. Please check your connection and try again.');
      }

      // Optimistic deadline state (only after confirmed write)
      setDeadlines((prev) => [deadline, ...prev]);

      // ── Chat messages ─────────────────────────────────────────────────────
      const now = new Date().toISOString();

      // User message echoing what they entered
      const userMsg: Message = {
        id: genId(),
        caseId,
        role: 'user',
        content: `${pf.triggerDateLabel.charAt(0).toUpperCase() + pf.triggerDateLabel.slice(1)}: ${triggerDateStr}`,
        createdAt: now,
      };

      // Confirmation message from Navigator
      const confirmMsg: Message = {
        id: genId(),
        caseId,
        role: 'navigator',
        content: [
          `✅ Deadline calculated and saved to your Deadlines tab.`,
          ``,
          `${pf.description}`,
          `Due: ${formattedDue}`,
          ``,
          `Rule basis: ${pf.ruleBasis}`,
          ``,
          `⚠️ Always confirm this date against your court's local rules before relying on it. Federal Rule 6 is a starting point — local rules can modify the period.`,
        ].join('\n'),
        createdAt: new Date(Date.now() + 5).toISOString(),
      };

      // Clear pending state + add messages
      setMessages((prev) => ({
        ...prev,
        [caseId]: [...(prev[caseId] ?? []), userMsg, confirmMsg],
      }));
      setCases((prev) =>
        prev.map((c) =>
          c.id === caseId
            ? { ...c, pendingFollowUp: undefined, lastMessageAt: confirmMsg.createdAt }
            : c,
        ),
      );

      // Persist messages + clear case pending state
      const [msgRes, caseRes] = await Promise.all([
        supabase.from('messages').insert([
          messageToDb(userMsg, user.id),
          messageToDb(confirmMsg, user.id),
        ]),
        supabase.from('cases').update({
          pending_follow_up: null,
          last_message_at: confirmMsg.createdAt,
        }).eq('id', caseId),
      ]);

      if (msgRes.error) console.error('[submitDeadlineTriggerDate] messages insert:', msgRes.error);
      if (caseRes.error) console.error('[submitDeadlineTriggerDate] case update:', caseRes.error);
    },
    [user, cases],
  );

  // ── sendMessage ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (caseId: string, content: string): Promise<void> => {
      if (!user) return;
      const targetCase = cases.find((c) => c.id === caseId);
      if (!targetCase) return;

      // ── Guard: deadline date entry mode ───────────────────────────────────
      // DeadlineDateEntry replaces ChatInput in this mode so sendMessage
      // shouldn't normally be called — but guard just in case.
      if (targetCase.pendingFollowUp?.kind === 'deadline_date_entry') return;

      const now = new Date().toISOString();
      const userMessage: Message = {
        id: genId(),
        caseId,
        role: 'user',
        content,
        createdAt: now,
      };

      const script   = intakeScripts[targetCase.caseType];
      const existing = messages[caseId] || [];

      // ── Check for action steps first ──────────────────────────────────────
      // Action steps (e.g. create_draft) are matched by label against the
      // last Navigator message's nextSteps. They do NOT go through normal intake.
      const lastNavMsgForAction = [...existing].reverse().find((m) => m.role === 'navigator');
      const matchedActionStep = lastNavMsgForAction?.nextSteps?.find(
        (s) => s.label === content && s.action,
      );

      if (matchedActionStep?.action === 'create_draft' && matchedActionStep.actionData) {
        const { title, kind } = matchedActionStep.actionData;

        // Persist just the user message; addArtifact posts the navigator reply
        setMessages((prev) => ({
          ...prev,
          [caseId]: [...(prev[caseId] ?? []), userMessage],
        }));
        setCases((prev) =>
          prev.map((c) => (c.id === caseId ? { ...c, lastMessageAt: now } : c)),
        );

        await supabase.from('messages').insert(messageToDb(userMessage, user.id));
        await supabase.from('cases').update({ last_message_at: now }).eq('id', caseId);

        // Create the artifact — this posts the estimate message + sets pendingFollowUp
        await addArtifact({
          caseId,
          caseTitle: targetCase.title,
          title: title || 'Document',
          content: `[Placeholder draft for "${title}". Full AI generation arrives in Phase 6.]`,
          kind: kind as ArtifactKind,
        });

        return;
      }

      // ── Normal intake + follow-up logic ───────────────────────────────────
      let navigatorMessage: Message | null = null;
      let newIntakeTurnIndex = targetCase.intakeTurnIndex;
      let newPendingFollowUp = targetCase.pendingFollowUp;

      // ── Follow-up resolution ───────────────────────────────────────────────
      if (targetCase.pendingFollowUp?.kind === 'intake_follow_up') {
        const resumeIdx = targetCase.pendingFollowUp.resumeTurnIndex;
        newPendingFollowUp  = undefined;
        newIntakeTurnIndex  = resumeIdx;

        if (resumeIdx < script.length) {
          const turn = script[resumeIdx];
          navigatorMessage = {
            id: genId(), caseId, role: 'navigator',
            content: turn.message, nextSteps: turn.nextSteps,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        } else if (resumeIdx === script.length) {
          navigatorMessage = {
            id: genId(), caseId, role: 'navigator',
            content: WRAP_UP_MESSAGE, nextSteps: WRAP_UP_NEXT_STEPS,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        } else {
          navigatorMessage = {
            id: genId(), caseId, role: 'navigator',
            content: POST_INTAKE_RESPONSE, nextSteps: POST_INTAKE_NEXT_STEPS,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        }
      } else {
        // ── Check for follow-up prompt ───────────────────────────────────────
        const lastNavMsg  = [...existing].reverse().find((m) => m.role === 'navigator');
        const matchedStep = lastNavMsg?.nextSteps?.find(
          (s) => s.label === content && s.followUpPrompt,
        );

        if (matchedStep?.followUpPrompt) {
          const resumeTurnIndex = targetCase.intakeTurnIndex + 1;
          newPendingFollowUp = {
            kind: 'intake_follow_up',
            prompt: matchedStep.followUpPrompt,
            resumeTurnIndex,
          } as PendingIntakeFollowUp;
          navigatorMessage = {
            id: genId(), caseId, role: 'navigator',
            content: matchedStep.followUpPrompt,
            // Attach document-type options when present on the matched step
            nextSteps: matchedStep.followUpNextSteps,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        } else {
          // ── Normal intake advancement ──────────────────────────────────────
          const nextTurnIndex = targetCase.intakeTurnIndex + 1;
          newIntakeTurnIndex  = nextTurnIndex;

          if (nextTurnIndex < script.length) {
            const turn = script[nextTurnIndex];
            navigatorMessage = {
              id: genId(), caseId, role: 'navigator',
              content: turn.message, nextSteps: turn.nextSteps,
              createdAt: new Date(Date.now() + 5).toISOString(),
            };
          } else if (nextTurnIndex === script.length) {
            navigatorMessage = {
              id: genId(), caseId, role: 'navigator',
              content: WRAP_UP_MESSAGE, nextSteps: WRAP_UP_NEXT_STEPS,
              createdAt: new Date(Date.now() + 5).toISOString(),
            };
          } else {
            newIntakeTurnIndex = targetCase.intakeTurnIndex;
            navigatorMessage = {
              id: genId(), caseId, role: 'navigator',
              content: POST_INTAKE_RESPONSE, nextSteps: POST_INTAKE_NEXT_STEPS,
              createdAt: new Date(Date.now() + 5).toISOString(),
            };
          }
        }
      }

      const newCaseMsgs = navigatorMessage
        ? [...existing, userMessage, navigatorMessage]
        : [...existing, userMessage];

      // ── Auto-title ─────────────────────────────────────────────────────────
      let updatedTitle = targetCase.title;
      if (newIntakeTurnIndex === 2 && !targetCase.title && !newPendingFollowUp) {
        const userResponses = [...existing, userMessage]
          .filter((m) => m.role === 'user')
          .map((m) => m.content);
        updatedTitle = generateCaseTitle(targetCase.caseType, userResponses);
      }

      const updatedCaseFields = {
        title: updatedTitle,
        intakeTurnIndex: newIntakeTurnIndex,
        pendingFollowUp: newPendingFollowUp,
        lastMessageAt: now,
      };
      const updatedCases    = cases.map((c) =>
        c.id === caseId ? { ...c, ...updatedCaseFields } : c,
      );
      const updatedMessages = { ...messages, [caseId]: newCaseMsgs };

      // Optimistic state update
      setCases(updatedCases);
      setMessages(updatedMessages);

      // Persist to Supabase — await both writes; roll back state on failure
      const msgsToInsert = [userMessage, ...(navigatorMessage ? [navigatorMessage] : [])];
      try {
        const [msgRes, caseRes] = await Promise.all([
          supabase.from('messages').insert(msgsToInsert.map((m) => messageToDb(m, user.id))),
          supabase.from('cases').update({
            title: updatedTitle,
            intake_turn_index: newIntakeTurnIndex,
            pending_follow_up: newPendingFollowUp ?? null,
            last_message_at: now,
          }).eq('id', caseId),
        ]);
        if (msgRes.error) throw msgRes.error;
        if (caseRes.error) throw caseRes.error;
      } catch (err) {
        // Rollback to pre-send state
        setCases(cases);
        setMessages(messages);
        throw err;
      }
    },
    [cases, messages, user, addArtifact],
  );

  // ── deleteCase ────────────────────────────────────────────────────────────
  const deleteCase = useCallback(
    async (id: string) => {
      // Snapshot every slice this delete touches so we can restore on failure.
      const prevCases     = cases;
      const prevMessages  = messages;
      const prevDeadlines = deadlines;
      const prevSources   = sources;
      const prevArtifacts = artifacts;
      const prevActiveId  = activeCaseId;

      const updatedMessages = { ...messages };
      delete updatedMessages[id];

      setCases(cases.filter((c) => c.id !== id));
      setMessages(updatedMessages);
      setDeadlines(deadlines.filter((d) => d.caseId !== id));
      setSources(sources.filter((s) => s.caseId !== id));
      setArtifacts(artifacts.filter((a) => a.caseId !== id));
      if (activeCaseId === id) setActiveCaseIdState(null);

      // ON DELETE CASCADE handles related rows
      const { error } = await supabase.from('cases').delete().eq('id', id);
      if (error) {
        console.error('[deleteCase] delete failed — rolling back:', error);
        setCases(prevCases);
        setMessages(prevMessages);
        setDeadlines(prevDeadlines);
        setSources(prevSources);
        setArtifacts(prevArtifacts);
        setActiveCaseIdState(prevActiveId);
      }
    },
    [cases, messages, deadlines, sources, artifacts, activeCaseId],
  );

  // ── updateCaseTitle ───────────────────────────────────────────────────────
  const updateCaseTitle = useCallback(
    async (id: string, title: string) => {
      const trimmed = title.trim();
      const prevCases = cases;
      const prevArtifacts = artifacts;

      setCases(cases.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
      setArtifacts(
        artifacts.map((a) => (a.caseId === id ? { ...a, caseTitle: trimmed } : a)),
      );

      // The case title is denormalized onto artifacts (case_title), so both
      // writes must succeed together. Roll back both slices if either fails.
      const [caseRes, artRes] = await Promise.all([
        supabase.from('cases').update({ title: trimmed }).eq('id', id),
        supabase.from('artifacts').update({ case_title: trimmed }).eq('case_id', id),
      ]);
      if (caseRes.error || artRes.error) {
        console.error(
          '[updateCaseTitle] update failed — rolling back:',
          caseRes.error ?? artRes.error,
        );
        setCases(prevCases);
        setArtifacts(prevArtifacts);
      }
    },
    [cases, artifacts],
  );

  // ── setActiveCase ─────────────────────────────────────────────────────────
  const setActiveCase = useCallback((id: string | null) => {
    setActiveCaseIdState(id);
  }, []);

  // ── getCaseMessages ───────────────────────────────────────────────────────
  const getCaseMessages = useCallback(
    (caseId: string) => messages[caseId] || [],
    [messages],
  );

  // ── addDeadline ───────────────────────────────────────────────────────────
  const addDeadline = useCallback(
    async (data: Omit<Deadline, 'id' | 'createdAt'>) => {
      if (!user) return;
      const deadline: Deadline = { ...data, id: genId(), createdAt: new Date().toISOString() };
      setDeadlines((prev) => [deadline, ...prev]);

      const { error } = await supabase.from('deadlines').insert({
        id: deadline.id,
        case_id: deadline.caseId,
        user_id: user.id,
        case_title: deadline.caseTitle,
        description: deadline.description,
        due_date: deadline.dueDate,
        rule_basis: deadline.ruleBasis,
        source: deadline.source ?? null,
        created_at: deadline.createdAt,
      });
      if (error) {
        console.error('[addDeadline] insert failed — rolling back:', error);
        setDeadlines((prev) => prev.filter((d) => d.id !== deadline.id));
      }
    },
    [user],
  );

  // ── addSource ─────────────────────────────────────────────────────────────
  const addSource = useCallback(
    async (data: Omit<VerifiedAuthority, 'id' | 'createdAt'>) => {
      if (!user) return;
      const source: VerifiedAuthority = { ...data, id: genId(), createdAt: new Date().toISOString() };
      setSources((prev) => [source, ...prev]);

      const { error } = await supabase.from('verified_authorities').insert({
        id: source.id,
        case_id: source.caseId,
        user_id: user.id,
        case_title: source.caseTitle,
        citation: source.citation,
        verified_status: source.verifiedStatus,
        url: source.url ?? null,
        quote: source.quote ?? null,
        created_at: source.createdAt,
      });
      if (error) {
        console.error('[addSource] insert failed — rolling back:', error);
        setSources((prev) => prev.filter((s) => s.id !== source.id));
      }
    },
    [user],
  );

  // ── Documents ─────────────────────────────────────────────────────────────
  const uploadDocument = useCallback(
    async (caseId: string, input: DocumentUploadInput): Promise<CaseDocument> => {
      if (!user) throw new Error('Not authenticated');
      const targetCase = cases.find((c) => c.id === caseId);
      const doc = await uploadCaseDocument({
        userId: user.id,
        caseId,
        caseTitle: targetCase?.title ?? '',
        input,
      });
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    },
    [user, cases],
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<void> => {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;
      // Optimistic removal with rollback if the storage/row delete fails.
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      try {
        await deleteCaseDocument(doc);
      } catch (err) {
        console.error('[deleteDocument] failed — rolling back:', err);
        setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== id)]);
        throw err;
      }
    },
    [documents],
  );

  const getDocumentUrl = useCallback(
    async (id: string): Promise<string> => {
      const doc = documents.find((d) => d.id === id);
      if (!doc) throw new Error('Document not found');
      return getDocumentSignedUrl(doc.storagePath);
    },
    [documents],
  );

  const getCaseDocuments = useCallback(
    (caseId: string) => documents.filter((d) => d.caseId === caseId),
    [documents],
  );

  // ── deleteArtifact ────────────────────────────────────────────────────────
  const deleteArtifact = useCallback(
    async (id: string) => {
      const removed = artifacts.find((a) => a.id === id);
      setArtifacts((prev) => prev.filter((a) => a.id !== id));

      const { error } = await supabase.from('artifacts').delete().eq('id', id);
      if (error && removed) {
        console.error('[deleteArtifact] delete failed — rolling back:', error);
        setArtifacts((prev) => [removed, ...prev.filter((a) => a.id !== id)]);
      }
    },
    [artifacts],
  );

  return (
    <CasesContext.Provider
      value={{
        cases,
        messages,
        deadlines,
        sources,
        artifacts,
        documents,
        activeCaseId,
        isLoading,
        refresh,
        createCase,
        deleteCase,
        updateCaseTitle,
        sendMessage,
        setActiveCase,
        getCaseMessages,
        addDeadline,
        addSource,
        addArtifact,
        deleteArtifact,
        submitDeadlineTriggerDate,
        uploadDocument,
        deleteDocument,
        getDocumentUrl,
        getCaseDocuments,
      }}
    >
      {children}
    </CasesContext.Provider>
  );
}

export function useCases() {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error('useCases must be used within CasesProvider');
  return ctx;
}
