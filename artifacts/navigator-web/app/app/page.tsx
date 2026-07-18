'use client';

/**
 * Layer 7 — the chat surface. Streaming chat + phase chips + case sidebar.
 * Case data wiring (Supabase) lands once schema.sql is applied; the surface
 * itself — streaming, chips, status visibility — is fully functional.
 */

import { useCallback, useRef, useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PHASE_CHIPS = [
  'Tell my story',
  'Upload evidence',
  'Show my claim options',
  'Run the viability check',
  'Pick my court',
  'What should I do next?',
];

export default function AppPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      setBusy(true);
      setInput('');
      const next: ChatMessage[] = [...messages, { role: 'user' as const, content }];
      setMessages([...next, { role: 'assistant', content: '' }]);

      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next }),
        });
        if (!resp.ok || !resp.body) {
          throw new Error((await resp.text()) || `Request failed (${resp.status})`);
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const snapshot = acc;
          setMessages([...next, { role: 'assistant', content: snapshot }]);
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }
      } catch (err) {
        setMessages([
          ...next,
          {
            role: 'assistant',
            content: `Something went wrong: ${err instanceof Error ? err.message : 'unknown error'}`,
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [messages, busy],
  );

  return (
    <div className="flex h-screen">
      {/* ── Case sidebar ── */}
      <aside className="hidden w-72 shrink-0 flex-col gap-4 border-r border-white/10 p-5 md:flex">
        <p className="text-xs tracking-[0.2em] text-[color:var(--primary)]">PROSE NAVIGATOR</p>
        <div className="rounded-lg border border-white/10 p-4">
          <p className="text-sm font-semibold">No active case</p>
          <p className="mt-1 text-xs text-white/50">
            Start with your story — the Navigator structures it into a case.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <p className="text-xs text-white/50">Current phase</p>
          <p className="mt-1 text-sm">Story Intake</p>
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <p className="text-xs text-white/50">Next deadline</p>
          <p className="mt-1 text-sm text-white/70">None yet</p>
        </div>
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
                Tell your story in your own words. No legal language needed —
                that part is the Navigator&apos;s job.
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
          {busy && (
            <p className="text-xs text-white/40">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[color:var(--primary)] align-middle" />
              Working…
            </p>
          )}
        </div>

        {/* ── Chips ── */}
        <div className="flex flex-wrap gap-2 px-5 pb-2">
          {PHASE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => send(chip)}
              disabled={busy}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-[color:var(--primary)]/60 hover:text-white disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>

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
            placeholder="Tell the Navigator what happened…"
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
