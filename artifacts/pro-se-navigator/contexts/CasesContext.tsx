import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Case, CaseType, Message, Deadline, VerifiedAuthority, CaseArtifact } from './types';
import { useAuth } from './AuthContext';
import intakeScripts, {
  WRAP_UP_MESSAGE,
  WRAP_UP_NEXT_STEPS,
  POST_INTAKE_RESPONSE,
  POST_INTAKE_NEXT_STEPS,
} from '@/data/intakeScripts';
import { generateCaseTitle } from '@/utils/autoTitle';

const casesKey     = (uid: string) => `@psn:cases:${uid}`;
const messagesKey  = (uid: string) => `@psn:messages:${uid}`;
const deadlinesKey = (uid: string) => `@psn:deadlines:${uid}`;
const sourcesKey   = (uid: string) => `@psn:sources:${uid}`;
const artifactsKey = (uid: string) => `@psn:artifacts:${uid}`;

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

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
  sendMessage: (caseId: string, content: string) => void;
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
  const [cases, setCases]               = useState<Case[]>([]);
  const [messages, setMessages]         = useState<Record<string, Message[]>>({});
  const [deadlines, setDeadlines]       = useState<Deadline[]>([]);
  const [sources, setSources]           = useState<VerifiedAuthority[]>([]);
  const [artifacts, setArtifacts]       = useState<CaseArtifact[]>([]);
  const [activeCaseId, setActiveCaseIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(true);

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
      const [c, m, d, s, a] = await Promise.all([
        AsyncStorage.getItem(casesKey(uid)),
        AsyncStorage.getItem(messagesKey(uid)),
        AsyncStorage.getItem(deadlinesKey(uid)),
        AsyncStorage.getItem(sourcesKey(uid)),
        AsyncStorage.getItem(artifactsKey(uid)),
      ]);
      if (c) setCases(JSON.parse(c));
      if (m) setMessages(JSON.parse(m));
      if (d) setDeadlines(JSON.parse(d));
      if (s) setSources(JSON.parse(s));
      if (a) setArtifacts(JSON.parse(a));
    } catch {
      // ignore storage errors
    } finally {
      setIsLoading(false);
    }
  };

  const persist = useCallback(
    async (
      newCases: Case[],
      newMessages: Record<string, Message[]>,
      newDeadlines: Deadline[],
      newSources: VerifiedAuthority[],
      newArtifacts: CaseArtifact[],
    ) => {
      if (!user) return;
      await Promise.all([
        AsyncStorage.setItem(casesKey(user.id), JSON.stringify(newCases)),
        AsyncStorage.setItem(messagesKey(user.id), JSON.stringify(newMessages)),
        AsyncStorage.setItem(deadlinesKey(user.id), JSON.stringify(newDeadlines)),
        AsyncStorage.setItem(sourcesKey(user.id), JSON.stringify(newSources)),
        AsyncStorage.setItem(artifactsKey(user.id), JSON.stringify(newArtifacts)),
      ]);
    },
    [user],
  );

  const createCase = useCallback(
    async (data: CreateCaseInput): Promise<Case> => {
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

      const updatedCases    = [newCase, ...cases];
      const updatedMessages = { ...messages, [newCase.id]: [openingMessage] };

      setCases(updatedCases);
      setMessages(updatedMessages);
      setActiveCaseIdState(newCase.id);
      persist(updatedCases, updatedMessages, deadlines, sources, artifacts);
      return newCase;
    },
    [cases, messages, deadlines, sources, artifacts, persist],
  );

  const sendMessage = useCallback(
    (caseId: string, content: string) => {
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

      const script = intakeScripts[targetCase.caseType];
      const existing = messages[caseId] || [];

      let navigatorMessage: Message | null = null;
      let newIntakeTurnIndex = targetCase.intakeTurnIndex;
      let newPendingFollowUp = targetCase.pendingFollowUp;

      // ── Follow-up resolution ─────────────────────────────────────────────────
      // If we were waiting for a free-text answer (e.g. "which state?"), this
      // message resolves it. Resume normal intake at the stored turn index.
      if (targetCase.pendingFollowUp) {
        const resumeIdx = targetCase.pendingFollowUp.resumeTurnIndex;
        newPendingFollowUp = undefined;
        newIntakeTurnIndex = resumeIdx;

        if (resumeIdx < script.length) {
          const turn = script[resumeIdx];
          navigatorMessage = {
            id: genId(),
            caseId,
            role: 'navigator',
            content: turn.message,
            nextSteps: turn.nextSteps,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        } else if (resumeIdx === script.length) {
          navigatorMessage = {
            id: genId(),
            caseId,
            role: 'navigator',
            content: WRAP_UP_MESSAGE,
            nextSteps: WRAP_UP_NEXT_STEPS,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        } else {
          navigatorMessage = {
            id: genId(),
            caseId,
            role: 'navigator',
            content: POST_INTAKE_RESPONSE,
            nextSteps: POST_INTAKE_NEXT_STEPS,
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        }
      } else {
        // ── Check if this message triggers a follow-up question ───────────────
        const lastNavMsg = [...existing].reverse().find((m) => m.role === 'navigator');
        const matchedStep = lastNavMsg?.nextSteps?.find(
          (s) => s.label === content && s.followUpPrompt,
        );

        if (matchedStep && matchedStep.followUpPrompt) {
          // Pause intake: ask the follow-up, don't advance intakeTurnIndex yet
          const resumeTurnIndex = targetCase.intakeTurnIndex + 1;
          newPendingFollowUp = { prompt: matchedStep.followUpPrompt, resumeTurnIndex };
          navigatorMessage = {
            id: genId(),
            caseId,
            role: 'navigator',
            content: matchedStep.followUpPrompt,
            // No nextSteps — we need free-text input
            createdAt: new Date(Date.now() + 5).toISOString(),
          };
        } else {
          // ── Normal intake advancement ────────────────────────────────────────
          const nextTurnIndex = targetCase.intakeTurnIndex + 1;
          newIntakeTurnIndex = nextTurnIndex;

          if (nextTurnIndex < script.length) {
            const turn = script[nextTurnIndex];
            navigatorMessage = {
              id: genId(),
              caseId,
              role: 'navigator',
              content: turn.message,
              nextSteps: turn.nextSteps,
              createdAt: new Date(Date.now() + 5).toISOString(),
            };
          } else if (nextTurnIndex === script.length) {
            navigatorMessage = {
              id: genId(),
              caseId,
              role: 'navigator',
              content: WRAP_UP_MESSAGE,
              nextSteps: WRAP_UP_NEXT_STEPS,
              createdAt: new Date(Date.now() + 5).toISOString(),
            };
          } else {
            newIntakeTurnIndex = targetCase.intakeTurnIndex;
            navigatorMessage = {
              id: genId(),
              caseId,
              role: 'navigator',
              content: POST_INTAKE_RESPONSE,
              nextSteps: POST_INTAKE_NEXT_STEPS,
              createdAt: new Date(Date.now() + 5).toISOString(),
            };
          }
        }
      }

      const newCaseMsgs = navigatorMessage
        ? [...existing, userMessage, navigatorMessage]
        : [...existing, userMessage];

      // ── Auto-title ───────────────────────────────────────────────────────────
      // Trigger when we reach the second intake turn (newIntakeTurnIndex === 2)
      // and no user-supplied title exists. This fires in the normal path AND
      // in the follow-up-resolution path (where pendingFollowUp was just cleared).
      // We explicitly exclude the pause path (newPendingFollowUp is set) because
      // we haven't advanced the turn index yet in that case.
      let updatedTitle = targetCase.title;
      if (newIntakeTurnIndex === 2 && !targetCase.title && !newPendingFollowUp) {
        const userResponses = [...existing, userMessage]
          .filter((m) => m.role === 'user')
          .map((m) => m.content);
        updatedTitle = generateCaseTitle(targetCase.caseType, userResponses);
      }

      const updatedCases = cases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              title: updatedTitle,
              intakeTurnIndex: newIntakeTurnIndex,
              pendingFollowUp: newPendingFollowUp,
              lastMessageAt: now,
            }
          : c,
      );
      const updatedMessages = { ...messages, [caseId]: newCaseMsgs };

      setCases(updatedCases);
      setMessages(updatedMessages);
      persist(updatedCases, updatedMessages, deadlines, sources, artifacts);
    },
    [cases, messages, deadlines, sources, artifacts, persist],
  );

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
      persist(updatedCases, updatedMessages, updatedDeadlines, updatedSources, updatedArtifacts);
    },
    [cases, messages, deadlines, sources, artifacts, activeCaseId, persist],
  );

  const updateCaseTitle = useCallback(
    (id: string, title: string) => {
      const updatedCases = cases.map((c) =>
        c.id === id ? { ...c, title: title.trim() } : c,
      );
      // Also update caseTitle in artifacts
      const updatedArtifacts = artifacts.map((a) =>
        a.caseId === id ? { ...a, caseTitle: title.trim() } : a,
      );
      setCases(updatedCases);
      setArtifacts(updatedArtifacts);
      persist(updatedCases, messages, deadlines, sources, updatedArtifacts);
    },
    [cases, messages, deadlines, sources, artifacts, persist],
  );

  const setActiveCase = useCallback((id: string | null) => {
    setActiveCaseIdState(id);
  }, []);

  const getCaseMessages = useCallback(
    (caseId: string) => messages[caseId] || [],
    [messages],
  );

  const addDeadline = useCallback(
    (data: Omit<Deadline, 'id' | 'createdAt'>) => {
      const deadline: Deadline = { ...data, id: genId(), createdAt: new Date().toISOString() };
      const updated = [...deadlines, deadline];
      setDeadlines(updated);
      persist(cases, messages, updated, sources, artifacts);
    },
    [cases, messages, deadlines, sources, artifacts, persist],
  );

  const addSource = useCallback(
    (data: Omit<VerifiedAuthority, 'id' | 'createdAt'>) => {
      const source: VerifiedAuthority = { ...data, id: genId(), createdAt: new Date().toISOString() };
      const updated = [...sources, source];
      setSources(updated);
      persist(cases, messages, deadlines, updated, artifacts);
    },
    [cases, messages, deadlines, sources, artifacts, persist],
  );

  const addArtifact = useCallback(
    (data: Omit<CaseArtifact, 'id' | 'createdAt'>) => {
      const artifact: CaseArtifact = { ...data, id: genId(), createdAt: new Date().toISOString() };
      const updated = [...artifacts, artifact];
      setArtifacts(updated);
      persist(cases, messages, deadlines, sources, updated);
    },
    [cases, messages, deadlines, sources, artifacts, persist],
  );

  const deleteArtifact = useCallback(
    (id: string) => {
      const updated = artifacts.filter((a) => a.id !== id);
      setArtifacts(updated);
      persist(cases, messages, deadlines, sources, updated);
    },
    [cases, messages, deadlines, sources, artifacts, persist],
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
