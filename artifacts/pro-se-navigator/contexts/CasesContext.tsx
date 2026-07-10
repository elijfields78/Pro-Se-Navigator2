import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { Case, CaseType, Message, Deadline, VerifiedAuthority, CaseArtifact } from './types';
import { useAuth } from './AuthContext';
import intakeScripts, {
  WRAP_UP_MESSAGE,
  WRAP_UP_NEXT_STEPS,
  POST_INTAKE_RESPONSE,
  POST_INTAKE_NEXT_STEPS,
} from '@/data/intakeScripts';
import { generateCaseTitle } from '@/utils/autoTitle';

// ── ID generator ────────────────────────────────────────────────────────────
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ── DB ↔ App type mappers ───────────────────────────────────────────────────
function dbToCase(row: Record<string, any>): Case {
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
    pendingFollowUp: row.pending_follow_up ?? undefined,
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
  activeCaseId: string | null;
  isLoading: boolean;
  createCase: (data: CreateCaseInput) => Promise<Case>;
  deleteCase: (id: string) => void;
  updateCaseTitle: (id: string, title: string) => void;
  sendMessage: (caseId: string, content: string) => Promise<void>;
  setActiveCase: (id: string | null) => void;
  getCaseMessages: (caseId: string) => Message[];
  addDeadline: (deadline: Omit<Deadline, 'id' | 'createdAt'>) => void;
  addSource: (source: Omit<VerifiedAuthority, 'id' | 'createdAt'>) => void;
  addArtifact: (artifact: Omit<CaseArtifact, 'id' | 'createdAt'>) => void;
  deleteArtifact: (id: string) => void;
}

const CasesContext = createContext<CasesContextType | null>(null);

export function CasesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cases, setCases]                   = useState<Case[]>([]);
  const [messages, setMessages]             = useState<Record<string, Message[]>>({});
  const [deadlines, setDeadlines]           = useState<Deadline[]>([]);
  const [sources, setSources]               = useState<VerifiedAuthority[]>([]);
  const [artifacts, setArtifacts]           = useState<CaseArtifact[]>([]);
  const [activeCaseId, setActiveCaseIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(true);

  // ── Load all data when user changes ───────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setCases([]);
      setMessages({});
      setDeadlines([]);
      setSources([]);
      setArtifacts([]);
      setActiveCaseIdState(null);
      setIsLoading(false);
      return;
    }
    loadAll(user.id);
  }, [user]);

  const loadAll = async (uid: string) => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

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

  // ── sendMessage ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (caseId: string, content: string): Promise<void> => {
      if (!user) return;
      const targetCase = cases.find((c) => c.id === caseId);
      if (!targetCase) return;

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

      let navigatorMessage: Message | null = null;
      let newIntakeTurnIndex = targetCase.intakeTurnIndex;
      let newPendingFollowUp = targetCase.pendingFollowUp;

      // ── Follow-up resolution ───────────────────────────────────────────────
      if (targetCase.pendingFollowUp) {
        const resumeIdx = targetCase.pendingFollowUp.resumeTurnIndex;
        newPendingFollowUp   = undefined;
        newIntakeTurnIndex   = resumeIdx;

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
          newPendingFollowUp = { prompt: matchedStep.followUpPrompt, resumeTurnIndex };
          navigatorMessage = {
            id: genId(), caseId, role: 'navigator',
            content: matchedStep.followUpPrompt,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        } else {
          // ── Normal intake advancement ────────────────────────────────────────
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
    [cases, messages, user],
  );

  // ── deleteCase ────────────────────────────────────────────────────────────
  const deleteCase = useCallback(
    (id: string) => {
      const updatedCases     = cases.filter((c) => c.id !== id);
      const updatedMessages  = { ...messages };
      delete updatedMessages[id];
      const updatedDeadlines = deadlines.filter((d) => d.caseId !== id);
      const updatedSources   = sources.filter((s) => s.caseId !== id);
      const updatedArtifacts = artifacts.filter((a) => a.caseId !== id);

      setCases(updatedCases);
      setMessages(updatedMessages);
      setDeadlines(updatedDeadlines);
      setSources(updatedSources);
      setArtifacts(updatedArtifacts);
      if (activeCaseId === id) setActiveCaseIdState(null);

      // ON DELETE CASCADE handles related rows
      supabase.from('cases')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('[deleteCase] delete:', error); });
    },
    [cases, messages, deadlines, sources, artifacts, activeCaseId],
  );

  // ── updateCaseTitle ───────────────────────────────────────────────────────
  const updateCaseTitle = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      const updatedCases = cases.map((c) =>
        c.id === id ? { ...c, title: trimmed } : c,
      );
      const updatedArtifacts = artifacts.map((a) =>
        a.caseId === id ? { ...a, caseTitle: trimmed } : a,
      );
      setCases(updatedCases);
      setArtifacts(updatedArtifacts);

      supabase.from('cases')
        .update({ title: trimmed })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('[updateCaseTitle] cases:', error); });

      supabase.from('artifacts')
        .update({ case_title: trimmed })
        .eq('case_id', id)
        .then(({ error }) => { if (error) console.error('[updateCaseTitle] artifacts:', error); });
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
    (data: Omit<Deadline, 'id' | 'createdAt'>) => {
      if (!user) return;
      const deadline: Deadline = { ...data, id: genId(), createdAt: new Date().toISOString() };
      setDeadlines((prev) => [deadline, ...prev]);

      supabase.from('deadlines')
        .insert({
          id: deadline.id,
          case_id: deadline.caseId,
          user_id: user.id,
          case_title: deadline.caseTitle,
          description: deadline.description,
          due_date: deadline.dueDate,
          rule_basis: deadline.ruleBasis,
          source: deadline.source ?? null,
          created_at: deadline.createdAt,
        })
        .then(({ error }) => { if (error) console.error('[addDeadline] insert:', error); });
    },
    [user],
  );

  // ── addSource ─────────────────────────────────────────────────────────────
  const addSource = useCallback(
    (data: Omit<VerifiedAuthority, 'id' | 'createdAt'>) => {
      if (!user) return;
      const source: VerifiedAuthority = { ...data, id: genId(), createdAt: new Date().toISOString() };
      setSources((prev) => [source, ...prev]);

      supabase.from('verified_authorities')
        .insert({
          id: source.id,
          case_id: source.caseId,
          user_id: user.id,
          case_title: source.caseTitle,
          citation: source.citation,
          verified_status: source.verifiedStatus,
          url: source.url ?? null,
          quote: source.quote ?? null,
          created_at: source.createdAt,
        })
        .then(({ error }) => { if (error) console.error('[addSource] insert:', error); });
    },
    [user],
  );

  // ── addArtifact ───────────────────────────────────────────────────────────
  const addArtifact = useCallback(
    (data: Omit<CaseArtifact, 'id' | 'createdAt'>) => {
      if (!user) return;
      const artifact: CaseArtifact = { ...data, id: genId(), createdAt: new Date().toISOString() };
      setArtifacts((prev) => [artifact, ...prev]);

      supabase.from('artifacts')
        .insert({
          id: artifact.id,
          case_id: artifact.caseId,
          user_id: user.id,
          case_title: artifact.caseTitle,
          title: artifact.title,
          content: artifact.content,
          kind: artifact.kind,
          created_at: artifact.createdAt,
        })
        .then(({ error }) => { if (error) console.error('[addArtifact] insert:', error); });
    },
    [user],
  );

  // ── deleteArtifact ────────────────────────────────────────────────────────
  const deleteArtifact = useCallback(
    (id: string) => {
      setArtifacts((prev) => prev.filter((a) => a.id !== id));

      supabase.from('artifacts')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('[deleteArtifact] delete:', error); });
    },
    [],
  );

  return (
    <CasesContext.Provider
      value={{
        cases,
        messages,
        deadlines,
        sources,
        artifacts,
        activeCaseId,
        isLoading,
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
