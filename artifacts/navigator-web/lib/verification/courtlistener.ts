/**
 * CourtListener adapter — primary source for case-law citations.
 *
 * POST /api/rest/v4/citation-lookup/ extracts every reporter citation from the
 * submitted text and matches each against the CourtListener database. The
 * response mapping is a pure function (`mapCourtListenerRows`) so it can be
 * unit-tested without network.
 */

const CITATION_LOOKUP_URL =
  'https://www.courtlistener.com/api/rest/v4/citation-lookup/';
const BASE = 'https://www.courtlistener.com';

export type PrimaryStatus = 'verified' | 'ambiguous' | 'not_found' | 'error';

export interface PrimaryResult {
  citation: string;
  status: PrimaryStatus;
  caseName?: string;
  url?: string;
}

export interface RawCluster {
  case_name?: string;
  caseName?: string;
  absolute_url?: string;
}

export interface RawCitationRow {
  citation?: string;
  status?: number;
  clusters?: RawCluster[];
}

function clusterName(c: RawCluster): string | undefined {
  return c.case_name ?? c.caseName;
}

function clusterUrl(c: RawCluster): string | undefined {
  if (!c.absolute_url) return undefined;
  return c.absolute_url.startsWith('http') ? c.absolute_url : `${BASE}${c.absolute_url}`;
}

/** Pure mapping from the API's rows to primary verification results. */
export function mapCourtListenerRows(rows: RawCitationRow[]): PrimaryResult[] {
  return rows.map((row) => {
    const citation = row.citation ?? '';
    const clusters = Array.isArray(row.clusters) ? row.clusters : [];
    const status = row.status;

    if (status === 200 && clusters.length === 1) {
      return {
        citation,
        status: 'verified' as const,
        caseName: clusterName(clusters[0]!),
        url: clusterUrl(clusters[0]!),
      };
    }
    if (clusters.length > 1 || status === 300) {
      return {
        citation,
        status: 'ambiguous' as const,
        caseName: clusters[0] ? clusterName(clusters[0]) : undefined,
        url: clusters[0] ? clusterUrl(clusters[0]) : undefined,
      };
    }
    if (status === 404 || clusters.length === 0) {
      return { citation, status: 'not_found' as const };
    }
    return { citation, status: 'error' as const };
  });
}

export function isCourtListenerConfigured(): boolean {
  return Boolean(process.env.COURTLISTENER_API_TOKEN);
}

/**
 * Submit text; CourtListener extracts and matches every case citation in it.
 * Text with no case citations returns an empty array.
 */
export async function lookupCaseCitations(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PrimaryResult[]> {
  const token = process.env.COURTLISTENER_API_TOKEN;
  if (!token) {
    throw new Error('COURTLISTENER_API_TOKEN is not set; case verification is disabled.');
  }

  let resp: Response;
  try {
    resp = await fetchImpl(CITATION_LOOKUP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.slice(0, 64000) }),
      // Bound the lookup — a hung upstream must not pin the export flow.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new Error('CourtListener lookup timed out.');
    }
    throw err;
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`CourtListener request failed (${resp.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await resp.json()) as RawCitationRow[] | { citations?: RawCitationRow[] };
  const rows: RawCitationRow[] = Array.isArray(data) ? data : (data.citations ?? []);
  return mapCourtListenerRows(rows);
}
