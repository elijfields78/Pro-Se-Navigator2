'use client';

/**
 * The Navigator surface — wired to the engines.
 *
 * Signed-out → email/password auth (Supabase). Signed-in → the chat drives
 * the cold-start workflow: the first messages ARE Phase 1 (story intake);
 * the narrative comes back for explicit approval; approval advances the FSM
 * server-side; the sidebar shows the real phase and exactly what the current
 * gate still needs. After intake, conversation continues through the
 * general Navigator chat with case context.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CaseInfo {
  id: string;
  title: string;
  phase: string;
  phaseTitle: string;
  missing: string[];
  evidenceCount: number;
  intakeQuestions: string[];
  narrative?: string;
  approved: boolean;
}

// ── Auth panel ──────────────────────────────────────────────────────────────

function SignIn() {
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const sb = supabaseBrowser();
    try {
      if (mode === 'sign_in') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6">
      <p className="text-xs tracking-[0.2em] text-[color:var(--primary)]">PROSE NAVIGATOR</p>
      <h1 className="text-2xl font-semibold">{mode === 'sign_in' ? 'Sign in' : 'Create your account'}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/35 focus:border-[color:var(--primary)]/60"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/35 focus:border-[color:var(--primary)]/60"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {notice && <p className="text-xs text-[color:var(--primary)]">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[color:var(--amber)] py-3 text-sm font-medium text-black disabled:opacity-40"
        >
          {busy ? 'Working…' : mode === 'sign_in' ? 'Sign in' : 'Sign up'}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
        className="text-xs text-white/50 hover:text-white"
      >
        {mode === 'sign_in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
      <p className="text-[11px] leading-relaxed text-white/35">
        Not legal advice. ProSe Navigator is not a law firm and never files anything for you.
      </p>
    </main>
  );
}

// ── The wired surface ───────────────────────────────────────────────────────

export default function AppPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState('');
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const storyParts = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Session tracking ──
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const authFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      const { data } = await supabaseBrowser().auth.getSession();
      const token = data.session?.access_token;
      return fetch(path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [],
  );

  const refreshCase = useCallback(
    async (caseId: string) => {
      const resp = await authFetch(`/api/cases/${caseId}`);
      if (!resp.ok) return;
      const data = await resp.json();
      setCaseInfo({
        id: data.case.id,
        title: data.case.title,
        phase: data.phase,
        phaseTitle: data.phaseTitle,
        missing: data.missing,
        evidenceCount: data.evidenceCount,
        intakeQuestions: data.intakeQuestions,
        narrative: data.case.fact_narrative ?? undefined,
        approved: Boolean(data.case.fact_narrative_approved),
      });
    },
    [authFetch],
  );

  // ── Load the most recent case on sign-in ──
  useEffect(() => {
    if (!session) return;
    (async () => {
      const resp = await authFetch('/api/cases');
      if (!resp.ok) return;
      const { cases } = (await resp.json()) as { cases: Array<{ id: string }> };
      if (cases.length > 0) await refreshCase(cases[0]!.id);
    })();
  }, [session, authFetch, refreshCase]);

  const pushAssistant = (content: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content }]);
  };

  // ── Phase 1: story intake flow ──
  const runIntake = useCallback(
    async (caseId: string) => {
      setStatusLine('Structuring your story…');
      const story = storyParts.current.join('\n\n');
      const resp = await authFetch(`/api/cases/${caseId}/intake`, {
        method: 'POST',
        body: JSON.stringify({ story }),
      });
      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: 'Intake failed.' }));
        throw new Error(error);
      }
      const data = (await resp.json()) as { narrative: string; questions: string[] };
      let reply = `Here's your story, structured:\n\n${data.narrative}`;
      if (data.questions.length > 0) {
        reply +=
          `\n\nA few questions to fill the gaps:\n` +
          data.questions.map((q) => `• ${q}`).join('\n') +
          `\n\nAnswer any of them, or approve the narrative to continue.`;
      } else {
        reply += `\n\nIf this looks right, approve it and we'll move to your evidence.`;
      }
      pushAssistant(reply);
      setPendingApproval(true);
      await refreshCase(caseId);
    },
    [authFetch, refreshCase],
  );

  const approve = useCallback(async () => {
    if (!caseInfo || busy) return;
    setBusy(true);
    setStatusLine('Advancing your case…');
    try {
      const resp = await authFetch(`/api/cases/${caseInfo.id}/approve-narrative`, { method: 'POST' });
      if (!resp.ok) throw new Error('Could not approve the narrative.');
      const data = (await resp.json()) as { phase: string; phaseTitle: string; missing: string[] };
      setPendingApproval(false);
      pushAssistant(
        `Narrative approved. You're now in **${data.phaseTitle}**.\n\n` +
          (data.missing.length > 0
            ? `To advance:\n${data.missing.map((m) => `• ${m}`).join('\n')}`
            : 'This phase is ready to advance.'),
      );
      await refreshCase(caseInfo.id);
    } catch (err) {
      pushAssistant(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
      setStatusLine('');
    }
  }, [caseInfo, busy, authFetch, refreshCase]);

  // ── General chat (post-intake) ──
  const generalChat = useCallback(
    async (next: ChatMessage[]) => {
      setStatusLine('Navigator is thinking…');
      const contextPrefix = caseInfo
        ? `Case context: "${caseInfo.title}" — current phase: ${caseInfo.phaseTitle}. ` +
          (caseInfo.missing.length ? `To advance this phase: ${caseInfo.missing.join(' ')}` : '')
        : '';
      const payload = contextPrefix
        ? [{ role: 'user' as const, content: contextPrefix }, ...next]
        : next;
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      if (!resp.ok || !resp.body) throw new Error((await resp.text()) || 'Chat failed.');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      setMessages([...next, { role: 'assistant', content: '' }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages([...next, { role: 'assistant', content: snapshot }]);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    },
    [caseInfo],
  );

  // ── Send router: story mode vs. general chat ──
  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      setBusy(true);
      setInput('');
      const next: ChatMessage[] = [...messages, { role: 'user' as const, content }];
      setMessages(next);

      try {
        const inStoryMode = !caseInfo || (caseInfo.phase === 'story_intake' && !caseInfo.approved);
        if (inStoryMode) {
          storyParts.current.push(content);
          let caseId = caseInfo?.id;
          if (!caseId) {
            setStatusLine('Opening your case…');
            const created = await authFetch('/api/cases', { method: 'POST', body: JSON.stringify({}) });
            if (!created.ok) throw new Error('Could not create your case. Are you signed in?');
            const { case: c } = await created.json();
            caseId = c.id as string;
            // Bind the UI to the new case BEFORE intake runs — if intake fails,
            // the retry must reuse this case, not silently create another one.
            await refreshCase(caseId);
          }
          await runIntake(caseId!);
        } else {
          await generalChat(next);
        }
      } catch (err) {
        pushAssistant(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setBusy(false);
        setStatusLine('');
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    },
    [messages, busy, caseInfo, authFetch, runIntake, generalChat],
  );

  // ── Render ──
  if (session === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-white/50">
        Loading…
      </main>
    );
  }
  if (!session) return <SignIn />;

  const inStoryMode = !caseInfo || (caseInfo.phase === 'story_intake' && !caseInfo.approved);
  const chips = inStoryMode
    ? pendingApproval
      ? ['Approve my narrative']
      : []
    : ['What should I do next?', 'What does this phase need?', 'Explain where my case stands'];

  return (
    <div className="flex h-screen">
      {/* ── Case sidebar — live state ── */}
      <aside className="hidden w-72 shrink-0 flex-col gap-4 border-r border-white/10 p-5 md:flex">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-[0.2em] text-[color:var(--primary)]">PROSE NAVIGATOR</p>
          <button
            onClick={() => supabaseBrowser().auth.signOut()}
            className="text-[11px] text-white/40 hover:text-white"
          >
            Sign out
          </button>
        </div>

        <div className="rounded-lg border border-white/10 p-4">
          <p className="text-sm font-semibold">{caseInfo?.title ?? 'No case yet'}</p>
          <p className="mt-1 text-xs text-white/50">
            {caseInfo ? 'Cold-start workflow' : 'Tell your story to open one.'}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 p-4">
          <p className="text-xs text-white/50">Current phase</p>
          <p className="mt-1 text-sm text-[color:var(--primary)]">
            {caseInfo?.phaseTitle ?? 'Story Intake'}
          </p>
        </div>

        {caseInfo && caseInfo.missing.length > 0 && (
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-xs text-white/50">To advance</p>
            <ul className="mt-2 space-y-1.5">
              {caseInfo.missing.map((m) => (
                <li key={m} className="text-xs leading-5 text-white/70">
                  • {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {caseInfo && (
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-xs text-white/50">Evidence items</p>
            <p className="mt-1 text-sm">{caseInfo.evidenceCount}</p>
          </div>
        )}

        <p className="mt-auto text-[11px] leading-relaxed text-white/35">
          Not legal advice. ProSe Navigator is not a law firm and never files
          anything for you.
        </p>
      </aside>

      {/* ── Chat panel ── */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {messages.length === 0 && (
            <div className="mx-auto mt-16 max-w-md text-center">
              <h1 className="text-2xl font-semibold">What happened?</h1>
              <p className="mt-2 text-sm text-white/60">
                Tell your story in your own words — no legal language needed.
                The Navigator listens first, then structures it with you.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-[color:var(--primary)]/10 px-4 py-3 text-sm'
                    : 'max-w-[90%] text-sm leading-7 text-white/90'
                }
              >
                {m.role === 'assistant' && (
                  <p className="mb-1 text-xs italic tracking-[0.2em] text-[color:var(--primary)]">
                    NAVIGATOR
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.content || (busy ? '…' : '')}</p>
              </div>
            </div>
          ))}
          {busy && statusLine && (
            <p className="text-xs text-white/40">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[color:var(--primary)] align-middle" />
              {statusLine}
            </p>
          )}
        </div>

        {/* ── Chips ── */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 pb-2">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => (chip === 'Approve my narrative' ? approve() : send(chip))}
                disabled={busy}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-[color:var(--primary)]/60 hover:text-white disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <form
          className="flex gap-2 border-t border-white/10 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              inStoryMode ? 'Tell the Navigator what happened…' : 'Ask the Navigator…'
            }
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/35 focus:border-[color:var(--primary)]/60"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="rounded-xl bg-[color:var(--amber)] px-5 text-sm font-medium text-black transition disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
