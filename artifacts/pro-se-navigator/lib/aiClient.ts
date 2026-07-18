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

export async function askNavigator(params: {
  message: string;
  caseType?: string;
  caseContext?: string;
}): Promise<NavigatorAnswer> {
  if (!API_BASE) {
    throw new Error('The AI assistant is not available yet. (API URL not configured.)');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });
  } catch {
    throw new Error('Could not reach the assistant. Check your connection and try again.');
  }

  if (resp.status === 429) {
    throw new Error('You are sending messages too quickly. Please wait a moment and try again.');
  }
  if (resp.status === 503) {
    throw new Error('The AI assistant is not available yet.');
  }
  if (!resp.ok) {
    throw new Error('The assistant could not answer that. Please try again.');
  }

  return (await resp.json()) as NavigatorAnswer;
}
