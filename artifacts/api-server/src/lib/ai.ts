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

// Mandatory review notice attached to every generated draft. The UI must show
// this — a generated document is user-controlled work product, never a filing.
export const DRAFT_DISCLAIMER =
  "Draft for review. Verify every fact, date, name, citation, signature requirement, service requirement, formatting rule, filing requirement, and court-specific instruction before using this document. This is not legal advice and this document has not been filed, reviewed by an attorney, or checked for legal sufficiency.";

const DRAFT_SYSTEM_PROMPT = `You are drafting a legal document that a self-represented litigant (pro se) will REVIEW, complete, and decide whether to use. You are not a lawyer and this is not legal advice.

Rules you must follow:
- Produce a clear, well-structured draft appropriate to the requested document type (e.g. a motion has a caption, an introduction, the relief sought, supporting argument, and a signature block; a letter has a header, body, and closing).
- NEVER invent facts. Do not make up case numbers, party names, dates, dollar amounts, addresses, court names, or judge names. Wherever you need a fact you were not given, insert a clearly marked placeholder in SQUARE BRACKETS AND ALL CAPS, e.g. [CASE NUMBER], [DATE OF SERVICE], [YOUR NAME]. The user will fill these in.
- Ground any legal assertion in the authorities provided under "RETRIEVED AUTHORITIES" and cite them inline with a bracketed number like [1]. If you have no authority for a legal point, phrase it cautiously and tell the user to verify it — do not fabricate a citation, rule, or case.
- Do not compute specific filing deadlines; the app has a separate deterministic calculator for that.
- Do NOT claim or imply the document is filed, ready to file, legally sufficient, or attorney-approved.
- Formatting, service, and filing rules vary by court. Include a short note reminding the user to check their specific court's local rules and formatting requirements.
- Write in plain, professional English.`;

export type DraftType = "motion" | "letter" | "form" | "other";

export interface DraftResponse {
  text: string;
  /** Unique [BRACKETED] placeholders the user still needs to fill in. */
  placeholders: string[];
  citations: NavigatorResponse["citations"];
  model: string;
  disclaimer: string;
}

/** Extract unique ALL-CAPS-ish bracketed placeholders, excluding citation
 *  markers like [1]. Used so the UI can list what the user still must supply. */
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\[[^\]]+\]/g) ?? [];
  const seen = new Set<string>();
  for (const m of matches) {
    const inner = m.slice(1, -1).trim();
    if (/^\d+$/.test(inner)) continue; // citation marker, not a placeholder
    seen.add(m);
  }
  return Array.from(seen);
}

/**
 * Generate a reviewable legal document draft with Claude Opus 4.8. Grounds legal
 * assertions in retrieved corpus authorities, flags every missing fact as a
 * placeholder, and never represents the output as a filing.
 */
export async function generateDraft(params: {
  documentType: DraftType;
  instructions: string;
  caseType?: string;
  caseContext?: string;
}): Promise<DraftResponse> {
  const { documentType, instructions, caseType, caseContext } = params;

  let authorities: RetrievalResult[] = [];
  try {
    authorities = await searchLegalCorpus(`${documentType} ${instructions}`, {
      caseType,
      limit: 6,
    });
  } catch {
    authorities = [];
  }

  const model = selectModel("legal_chat");
  const userContent = [
    `DOCUMENT TYPE: ${documentType}`,
    caseContext ? `CASE CONTEXT (facts known so far): ${caseContext}` : null,
    buildAuthoritiesBlock(authorities),
    `DRAFTING INSTRUCTIONS: ${instructions}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await getClient().messages.create({
    model,
    max_tokens: 8000,
    system: DRAFT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    text,
    placeholders: extractPlaceholders(text),
    citations: authorities.map((r, i) => ({
      n: i + 1,
      citation: r.citation,
      url: r.url,
      heading: r.heading,
      excerpt: r.excerpt,
    })),
    model,
    disclaimer: DRAFT_DISCLAIMER,
  };
}

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
