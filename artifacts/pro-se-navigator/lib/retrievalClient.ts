/**
 * Client for the legal-corpus retrieval endpoint on the api-server
 * (POST /api/retrieval/search). Attaches the current Supabase access token so
 * the request keeps working once the endpoint enforces auth (RETRIEVAL_REQUIRE_AUTH).
 *
 * The api-server base URL comes from EXPO_PUBLIC_API_URL. When it isn't set,
 * `isRetrievalConfigured()` is false and the UI shows a "not available yet"
 * state instead of attempting a request.
 */
import { supabase } from '@/lib/supabase';
import { API_BASE, timeoutSignal } from '@/lib/apiBase';

export interface LegalSearchResult {
  citation: string;
  title: string;
  url: string;
  jurisdiction: string;
  sourceType: string; // 'rule' | 'statute'
  heading: string;
  excerpt: string;
  score: number;
}

export function isRetrievalConfigured(): boolean {
  return Boolean(API_BASE);
}

/** Human-readable authority label. Rules and statutes are primary authority
 *  (Tier 1) — the top of the source hierarchy the product ranks by. */
export function authorityLabel(sourceType: string): string {
  if (sourceType === 'statute') return 'Statute · Primary authority';
  if (sourceType === 'rule') return 'Court rule · Primary authority';
  return 'Authority';
}

export async function searchLegalLibrary(
  query: string,
  opts: { caseType?: string; limit?: number } = {},
): Promise<LegalSearchResult[]> {
  if (!API_BASE) {
    throw new Error('Legal research is not available yet. (API URL not configured.)');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/api/retrieval/search`, {
      method: 'POST',
      signal: timeoutSignal(30_000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query,
        caseType: opts.caseType,
        limit: opts.limit,
      }),
    });
  } catch {
    throw new Error('Could not reach the legal library. Check your connection and try again.');
  }

  if (resp.status === 429) {
    throw new Error('Too many searches right now. Please wait a moment and try again.');
  }
  if (resp.status === 503) {
    throw new Error('The legal library is temporarily unavailable. Please try again shortly.');
  }
  if (!resp.ok) {
    throw new Error('Search failed. Please try again.');
  }

  const body = (await resp.json()) as { results?: LegalSearchResult[] };
  const results = body.results ?? [];
  // The server's ts_headline highlights matched terms with <b>…</b>. React
  // Native <Text> has no HTML, so strip the tags for plain-text display.
  return results.map((r) => ({
    ...r,
    excerpt: r.excerpt.replace(/<\/?b>/gi, ''),
  }));
}
