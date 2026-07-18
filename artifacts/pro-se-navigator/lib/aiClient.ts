/**
 * Client for the server-side AI router (POST /api/ai/chat). The mobile app never
 * calls a model directly — it calls this endpoint, which grounds the answer in
 * the legal corpus and returns numbered citations. Base URL from
 * EXPO_PUBLIC_API_URL; attaches the Supabase access token as Bearer.
 */
import { supabase } from '@/lib/supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface AiCitation {
  n: number;
  citation: string;
  url: string;
  heading: string;
  excerpt: string;
}

export interface NavigatorAnswer {
  text: string;
  citations: AiCitation[];
  model: string;
  ungrounded: boolean;
}

export function isAiConfigured(): boolean {
  return Boolean(API_BASE);
}

export interface ResearchCitation {
  title?: string;
  url: string;
}

export interface ResearchAnswer {
  text: string;
  citations: ResearchCitation[];
  model: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Shared error mapping for the AI endpoints. */
function aiError(status: number): string {
  if (status === 429) return 'You are sending requests too quickly. Please wait a moment and try again.';
  if (status === 503) return 'This feature is not available yet.';
  return 'The request could not be completed. Please try again.';
}

/** Ask the Navigator (Claude) — grounded in the local legal corpus, cited [n]. */
export async function askNavigator(params: {
  message: string;
  caseType?: string;
  caseContext?: string;
}): Promise<NavigatorAnswer> {
  if (!API_BASE) {
    throw new Error('The AI assistant is not available yet. (API URL not configured.)');
  }

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });
  } catch {
    throw new Error('Could not reach the assistant. Check your connection and try again.');
  }

  if (!resp.ok) throw new Error(aiError(resp.status));
  return (await resp.json()) as NavigatorAnswer;
}

/** Research agent (Perplexity Sonar) — live web research with source citations. */
export async function researchWeb(params: {
  query: string;
  caseContext?: string;
}): Promise<ResearchAnswer> {
  if (!API_BASE) {
    throw new Error('Legal research is not available yet. (API URL not configured.)');
  }

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/api/ai/research`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });
  } catch {
    throw new Error('Could not reach the research service. Check your connection and try again.');
  }

  if (!resp.ok) throw new Error(aiError(resp.status));
  return (await resp.json()) as ResearchAnswer;
}
