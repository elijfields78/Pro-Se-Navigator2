import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Case, CaseType, Message, Deadline, VerifiedAuthority } from './types';
import { useAuth } from './AuthContext';
import intakeScripts, {
  WRAP_UP_MESSAGE,
  WRAP_UP_NEXT_STEPS,
  POST_INTAKE_RESPONSE,
  POST_INTAKE_NEXT_STEPS,
} from '@/data/intakeScripts';
import { generateCaseTitle } from '@/utils/autoTitle';

const casesKey    = (uid: string) => `@psn:cases:${uid}`;
const messagesKey = (uid: string) => `@psn:messages:${uid}`;
const deadlinesKey = (uid: string) => `@psn:deadlines:${uid}`;
const sourcesKey  = (uid: string) => `@psn:sources:${uid}`;

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
  activeCaseId: string | null;
  isLoading: boolean;
  createCase: (data: CreateCaseInput) => Promise<Case>;
  sendMessage: (caseId: string, content: string) => void;
  setActiveCase: (id: string | null) => void;
  getCaseMessages: (caseId: string) => Message[];
  addDeadline: (deadline: Omit<Deadline, 'id' | 'createdAt'>) => void;
  addSource: (source: Omit<VerifiedAuthority, 'id' | 'createdAt'>) => void;
}

const CasesContext = createContext<CasesContextType | null>(null);

export function CasesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cases, setCases]               = useState<Case[]>([]);
  const [messages, setMessages]         = useState<Record<string, Message[]>>({});
  const [deadlines, setDeadlines]       = useState<Deadline[]>([]);
  const [sources, setSources]           = useState<VerifiedAuthority[]>([]);
  const [activeCaseId, setActiveCaseIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    if (!user) {
      setCases([]);
      setMessages({});
      setDeadlines([]);
      setSources([]);
      setActiveCaseIdState(null);
      setIsLoading(false);
      return;
    }
    loadAll(user.id);
  }, [user]);

  const loadAll = async (uid: string) => {
    setIsLoading(true);
    try {
      const [c, m, d, s] = await Promise.all([
        AsyncStorage.getItem(casesKey(uid)),
        AsyncStorage.getItem(messagesKey(uid)),
        AsyncStorage.getItem(deadlinesKey(uid)),
        AsyncStorage.getItem(sourcesKey(uid)),
      ]);
      if (c) setCases(JSON.parse(c));
      if (m) setMessages(JSON.parse(m));
      if (d) setDeadlines(JSON.parse(d));
      if (s) setSources(JSON.parse(s));
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
    ) => {
      if (!user) return;
      await Promise.all([
        AsyncStorage.setItem(casesKey(user.id), JSON.stringify(newCases)),
        AsyncStorage.setItem(messagesKey(user.id), JSON.stringify(newMessages)),
        AsyncStorage.setItem(deadlinesKey(user.id), JSON.stringify(newDeadlines)),
        AsyncStorage.setItem(sourcesKey(user.id), JSON.stringify(newSources)),
      ]);
    },
    [user],
  );

  const createCase = useCallback(
    async (data: CreateCaseInput): Promise<Case> => {
      const newCase: Case = {
        id: genId(),
        // Empty string = no user-provided title; will be auto-generated after intake
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
      persist(updatedCases, updatedMessages, deadlines, sources);
      return newCase;
    },
    [cases, messages, deadlines, sources, persist],
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
      const nextTurnIndex = targetCase.intakeTurnIndex + 1;

      let navigatorMessage: Message | null = null;
      let newIntakeTurnIndex = nextTurnIndex;

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

      const existing = messages[caseId] || [];
      const newCaseMsgs = navigatorMessage
        ? [...existing, userMessage, navigatorMessage]
        : [...existing, userMessage];

      // ── Auto-title ──────────────────────────────────────────────────────────
      // Trigger after the user's SECOND response (nextTurnIndex === 2) when we
      // have two data points to build a meaningful title from.
      // Only fires when no user-supplied title was given (title === '').
      let updatedTitle = targetCase.title;
      if (nextTurnIndex === 2 && !targetCase.title) {
        // Collect the two user responses in order
        const userResponses = [...existing, userMessage]
          .filter((m) => m.role === 'user')
          .map((m) => m.content);
        updatedTitle = generateCaseTitle(targetCase.caseType, userResponses);
      }

      const updatedCases = cases.map((c) =>
        c.id === caseId
          ? { ...c, title: updatedTitle, intakeTurnIndex: newIntakeTurnIndex, lastMessageAt: now }
          : c,
      );
      const updatedMessages = { ...messages, [caseId]: newCaseMsgs };

      setCases(updatedCases);
      setMessages(updatedMessages);
      persist(updatedCases, updatedMessages, deadlines, sources);
    },
    [cases, messages, deadlines, sources, persist],
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
      const deadline: Deadline = {
        ...data,
        id: genId(),
        createdAt: new Date().toISOString(),
      };
      const updated = [...deadlines, deadline];
      setDeadlines(updated);
      persist(cases, messages, updated, sources);
    },
    [cases, messages, deadlines, sources, persist],
  );

  const addSource = useCallback(
    (data: Omit<VerifiedAuthority, 'id' | 'createdAt'>) => {
      const source: VerifiedAuthority = {
        ...data,
        id: genId(),
        createdAt: new Date().toISOString(),
      };
      const updated = [...sources, source];
      setSources(updated);
      persist(cases, messages, deadlines, updated);
    },
    [cases, messages, deadlines, sources, persist],
  );

  return (
    <CasesContext.Provider
      value={{
        cases,
        messages,
        deadlines,
        sources,
        activeCaseId,
        isLoading,
        createCase,
        sendMessage,
        setActiveCase,
        getCaseMessages,
        addDeadline,
        addSource,
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
