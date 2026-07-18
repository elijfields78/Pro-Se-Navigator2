// Perplexity Sonar research provider. Perplexity does live web research and
// returns answers grounded in current sources with citations — this is the
// "research agent" in the stack (Claude handles drafting and legal analysis).
//
// The API is OpenAI-compatible: POST https://api.perplexity.ai/chat/completions
// with a Bearer key. Response parsing is deliberately tolerant of shape drift
// (citations have moved between a `citations` URL array and a richer
// `search_results` array across API versions) — we read whichever is present.

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

export function isResearchConfigured(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

/** Sonar model. `sonar-pro` balances research depth and citation quality;
 *  override with PERPLEXITY_MODEL (e.g. `sonar-reasoning-pro`, `sonar-deep-research`). */
function researchModel(): string {
  return process.env.PERPLEXITY_MODEL ?? "sonar-pro";
}

const RESEARCH_SYSTEM_PROMPT = `You are a legal research assistant for a self-represented litigant (pro se). Research the user's question using current, authoritative sources.

- Prioritize PRIMARY and OFFICIAL sources: statutes, court rules, published court opinions, and official government/court websites (.gov, official court domains). Treat blogs, forums, and marketing pages as leads only, never as controlling authority.
- Report what you find in plain English, and make clear which court or jurisdiction each source applies to. Law varies by jurisdiction and by local court rules.
- Distinguish clearly between primary authority (binding law) and secondary sources (commentary).
- If sources conflict, say so and explain which is more authoritative.
- This is legal information for research, not legal advice. Do not tell the user what to do in their specific case; tell them what the law says and what to verify with a licensed attorney.`;

export interface ResearchResult {
  text: string;
  citations: Array<{ title?: string; url: string }>;
  model: string;
}

export async function researchWithPerplexity(params: {
  query: string;
  caseContext?: string;
}): Promise<ResearchResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not set; research is disabled.");
  }

  const model = researchModel();
  const userContent = params.caseContext
    ? `CASE CONTEXT: ${params.caseContext}\n\nRESEARCH QUESTION: ${params.query}`
    : params.query;

  const resp = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Perplexity request failed (${resp.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
    search_results?: Array<{ title?: string; url?: string }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";

  let citations: Array<{ title?: string; url: string }> = [];
  if (Array.isArray(data.search_results) && data.search_results.length > 0) {
    citations = data.search_results
      .filter((r): r is { title?: string; url: string } => Boolean(r.url))
      .map((r) => ({ title: r.title, url: r.url }));
  } else if (Array.isArray(data.citations)) {
    citations = data.citations
      .filter((u): u is string => typeof u === "string")
      .map((u) => ({ url: u }));
  }

  return { text, citations, model };
}

const CONFIRM_SYSTEM_PROMPT = `You verify whether a legal citation refers to a REAL, published court decision. Search authoritative legal sources (official court websites, Google Scholar, Justia, CourtListener, official reporters).

Respond in EXACTLY this format:
Line 1: CONFIRMED or NOT CONFIRMED
Line 2: one sentence — if confirmed, give the case name and court; if not, say you could not find it.

Only say CONFIRMED if you actually found an authoritative source for this specific citation. Do not guess. If you are unsure or cannot find a source, say NOT CONFIRMED.`;

export interface CitationConfirmation {
  confirmed: boolean;
  sourceUrl?: string;
  note: string;
}

/**
 * Independent second-source check: ask Perplexity (live web) whether a specific
 * citation refers to a real case. Requires both an affirmative CONFIRMED and at
 * least one real source URL — so a bare LLM assertion without a source does NOT
 * count as confirmation.
 */
export async function confirmCitationWithPerplexity(params: {
  citation: string;
  caseName?: string;
}): Promise<CitationConfirmation> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not set; secondary verification is disabled.");
  }

  const query = params.caseName
    ? `Citation: ${params.citation}. Reported case name: ${params.caseName}.`
    : `Citation: ${params.citation}.`;

  const resp = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: researchModel(),
      messages: [
        { role: "system", content: CONFIRM_SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Perplexity confirm failed (${resp.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
    search_results?: Array<{ url?: string }>;
  };

  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  const affirmed = /^\s*CONFIRMED\b/i.test(text);

  let sourceUrl: string | undefined;
  if (Array.isArray(data.search_results) && data.search_results[0]?.url) {
    sourceUrl = data.search_results[0].url;
  } else if (Array.isArray(data.citations) && typeof data.citations[0] === "string") {
    sourceUrl = data.citations[0];
  }

  // Confirmation requires BOTH an affirmative answer and a real source URL.
  const confirmed = affirmed && Boolean(sourceUrl);
  const note = text.split("\n").slice(1).join(" ").trim() || text;

  return { confirmed, sourceUrl, note };
}
