/**
 * Layer 7 — streaming chat endpoint. One conversational surface; heavy work
 * belongs to subagents and the meta-loop, not this route.
 */
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const SYSTEM = `You are ProSe Navigator, a guide for self-represented (pro se) litigants.
- Plain English. Explain legal terms when you must use them.
- You provide legal information and document preparation, not legal advice.
- Be honest about weaknesses; never oversell a claim.
- Never suggest sovereign-citizen theories or vocabulary.
- The user files everything themselves; you never file, send, or submit anything.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY is not configured.', { status: 503 });
  }

  const { messages } = (await req.json().catch(() => ({}))) as {
    messages?: Array<{ role?: string; content?: string }>;
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages[] required', { status: 400 });
  }
  // Validate shape and bound size — this endpoint spends real tokens.
  const clean: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of messages.slice(-30)) {
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return new Response('each message needs role user|assistant and string content', { status: 400 });
    }
    clean.push({ role: m.role, content: m.content.slice(0, 8000) });
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: 'claude-sonnet-5',
    max_tokens: 2000,
    system: SYSTEM,
    messages: clean,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on('text', (delta) => controller.enqueue(encoder.encode(delta)));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
