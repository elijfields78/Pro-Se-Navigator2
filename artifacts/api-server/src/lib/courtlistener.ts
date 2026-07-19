// CourtListener citation verification (Phase 7 verification gate). When an AI
// answer or research result cites a court opinion by reporter citation
// (e.g. "410 U.S. 113"), we confirm it resolves to a REAL case before the app
// shows it as verified. Hallucinated or wrong citations come back not-found and
// are flagged rather than trusted.
//
// Uses the v4 Citation Lookup API:
//   POST https://www.courtlistener.com/api/rest/v4/citation-lookup/
//   Authorization: Token <COURTLISTENER_API_TOKEN>
//   body: { text }  -> extracts citations from the text and matches each one.
// The response is an array of per-citation objects with an HTTP-like `status`
// (200 matched, 404 not found, 300+ multiple matches) and a `clusters` array of
// matched opinions. Parsing is tolerant of field drift.

const CITATION_LOOKUP_URL =
  "https://www.courtlistener.com/api/rest/v4/citation-lookup/";
const BASE = "https://www.courtlistener.com";

export function isVerificationConfigured(): boolean {
  return Boolean(process.env.COURTLISTENER_API_TOKEN);
}

export type VerificationStatus =
  | "verified" // resolves to exactly one real case
  | "ambiguous" // matches more than one case
  | "not_found" // no matching case — possible hallucination
  | "error"; // lookup failed for this citation

export interface CitationVerification {
  citation: string;
  status: VerificationStatus;
  caseName?: string;
  /** Absolute CourtListener URL for the matched opinion. */
  url?: string;
}

interface RawCluster {
  case_name?: string;
  caseName?: string;
  absolute_url?: string;
}

interface RawCitation {
  citation?: string;
  status?: number;
  clusters?: RawCluster[];
}

function clusterName(c: RawCluster): string | undefined {
  return c.case_name ?? c.caseName;
}

function clusterUrl(c: RawCluster): string | undefined {
  if (!c.absolute_url) return undefined;
  return c.absolute_url.startsWith("http") ? c.absolute_url : `${BASE}${c.absolute_url}`;
}

/**
 * Submit a block of text (an AI answer or a list of citations) and verify each
 * reporter citation it contains against CourtListener. Returns one result per
 * citation found; text with no case citations returns an empty array.
 */
export async function verifyCitationsInText(
  text: string,
): Promise<CitationVerification[]> {
  const token = process.env.COURTLISTENER_API_TOKEN;
  if (!token) {
    throw new Error("COURTLISTENER_API_TOKEN is not set; verification is disabled.");
  }

  let resp: Response;
  try {
    resp = await fetch(CITATION_LOOKUP_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text.slice(0, 64000) }),
      // Bound the lookup so a hung upstream can't pin the request.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error("CourtListener lookup timed out.");
    }
    throw err;
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`CourtListener request failed (${resp.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await resp.json()) as RawCitation[] | { citations?: RawCitation[] };
  const rows: RawCitation[] = Array.isArray(data) ? data : (data.citations ?? []);

  return rows.map((row) => {
    const citation = row.citation ?? "";
    const clusters = Array.isArray(row.clusters) ? row.clusters : [];
    const status = row.status;

    if (status === 200 && clusters.length === 1) {
      return {
        citation,
        status: "verified",
        caseName: clusterName(clusters[0]!),
        url: clusterUrl(clusters[0]!),
      };
    }
    if (clusters.length > 1 || status === 300) {
      return {
        citation,
        status: "ambiguous",
        caseName: clusters[0] ? clusterName(clusters[0]) : undefined,
        url: clusters[0] ? clusterUrl(clusters[0]) : undefined,
      };
    }
    if (status === 404 || clusters.length === 0) {
      return { citation, status: "not_found" };
    }
    return { citation, status: "error" };
  });
}
