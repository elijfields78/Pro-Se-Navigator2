import Anthropic from "@anthropic-ai/sdk";
import { searchLegalCorpus, type RetrievalResult } from "./retrieval";

// Server-side only. The mobile client never calls a model directly — it goes
// through this router, which grounds every answer in the retrieved legal corpus
// and returns the sources so the app can render inline citations.

let client: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set; AI features are disabled.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Model router. Legal reasoning is high-stakes, so it runs on the most capable
// model; lighter tasks (titles, classification) can be routed to a cheaper model
// as they're added. Keeping this a function makes that routing explicit.
export type AiTask = "legal_chat" | "classify";

export function selectModel(task: AiTask): string {
  switch (task) {
    case "classify":
      return "claude-haiku-4-5";
    case "legal_chat":
    default:
      return "claude-opus-4-8";
  }
}

const SYSTEM_PROMPT = `You are the Navigator in Pro Se Navigator, a legal-information assistant for people representing themselves in court (pro se litigants). You are not a lawyer and this is not legal advice.

Rules you must follow:
- Provide legal INFORMATION and help the user organize and understand their situation. Do not tell the user what they "should" do as if it were legal advice for their specific case.
- Ground your answer in the legal authorities provided to you below under "RETRIEVED AUTHORITIES". When you rely on one, cite it inline with a bracketed number like [1] that matches its number in that list.
- If the retrieved authorities do not cover the question, say so plainly. NEVER invent a statute, rule, case name, citation, or holding. It is better to say "I don't have a source for that" than to guess.
- Many rules and deadlines vary by jurisdiction and by local court rules. When the answer depends on jurisdiction, say so and tell the user to check their specific court's rules.
- Do not compute or assert specific filing deadlines yourself — the app has a separate deterministic deadline calculator for that. You may explain what event starts a deadline and which rule governs.
- Decline to help with frivolous or "sovereign citizen" style arguments; explain briefly that courts reject them.
- Write in plain English a non-lawyer can follow. Be concise and practical.
- End with a one-line reminder that this is legal information, not legal advice, and that they should confirm anything important with a licensed attorney in their jurisdiction.`;

export interface NavigatorResponse {
  text: string;
  citations: Array<{
    n: number;
    citation: string;
    url: string;
    heading: string;
    excerpt: string;
  }>;
  model: string;
  /** True when no grounding authorities were found for the question. */
  ungrounded: boolean;
}

function buildAuthoritiesBlock(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return "RETRIEVED AUTHORITIES: (none found for this question)";
  }
  const lines = results.map(
    (r, i) =>
      `[${i + 1}] ${r.citation} — ${r.heading}\n    ${r.excerpt}\n    Source: ${r.url}`,
  );
  return `RETRIEVED AUTHORITIES:\n${lines.join("\n")}`;
}

/**
 * Generate a grounded Navigator answer to a plain-English legal question.
 * Retrieves relevant corpus authorities first, passes them to the model as the
 * only citable grounding, and returns the answer plus the numbered sources.
 */
export async function generateNavigatorResponse(params: {
  message: string;
  caseType?: string;
  /** Optional short case context (title, type) to orient the model. */
  caseContext?: string;
}): Promise<NavigatorResponse> {
  const { message, caseType, caseContext } = params;

  // RAG: ground the answer in the legal corpus.
  let authorities: RetrievalResult[] = [];
  try {
    authorities = await searchLegalCorpus(message, { caseType, limit: 6 });
  } catch {
    // Retrieval failure shouldn't block the answer; the model is told there are
    // no authorities and will respond accordingly (ungrounded).
    authorities = [];
  }

  const model = selectModel("legal_chat");
  const userContent = [
    caseContext ? `CASE CONTEXT: ${caseContext}` : null,
    buildAuthoritiesBlock(authorities),
    `USER QUESTION: ${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await getClient().messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    text,
    citations: authorities.map((r, i) => ({
      n: i + 1,
      citation: r.citation,
      url: r.url,
      heading: r.heading,
      excerpt: r.excerpt,
    })),
    model,
    ungrounded: authorities.length === 0,
  };
}
