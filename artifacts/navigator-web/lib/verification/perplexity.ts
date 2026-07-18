/**
 * Perplexity adapter — independent secondary check for case citations the
 * primary source (CourtListener) could not confirm. A real case that
 * CourtListener doesn't index can still be corroborated by the live web; a
 * citation BOTH sources fail on is flagged, never silently trusted.
 *
 * This is a lookup, not a reasoning task: the model is instructed to answer
 * only from retrieved sources with a strict verdict format.
 */

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

const CONFIRM_SYSTEM_PROMPT = `You verify whether a legal citation refers to a real, published court case. Search for the citation. Answer in EXACTLY this format:
VERDICT: CONFIRMED or NOT-CONFIRMED
SOURCE: <the single most authoritative URL you found, or NONE>
NOTE: <one sentence>
Only answer CONFIRMED if a retrieved source shows this exact citation refers to a real case. Do not reason your way to an answer; report only what the sources show.`;

export interface SecondaryConfirmation {
  confirmed: boolean;
  sourceUrl?: string;
  note?: string;
}

export function isPerplexityConfigured(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

/** Pure parser for the strict verdict format (unit-testable). */
export function parseConfirmation(content: string): SecondaryConfirmation {
  const verdict = /VERDICT:\s*(CONFIRMED|NOT-CONFIRMED)/i.exec(content)?.[1];
  const source = /SOURCE:\s*(\S+)/i.exec(content)?.[1];
  const note = /NOTE:\s*(.+)/i.exec(content)?.[1]?.trim();
  return {
    confirmed: verdict?.toUpperCase() === 'CONFIRMED',
    sourceUrl: source && source.toUpperCase() !== 'NONE' ? source : undefined,
    note,
  };
}

export async function confirmCaseCitation(
  params: { citation: string; caseName?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<SecondaryConfirmation> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set; secondary verification is disabled.');
  }

  const query = params.caseName
    ? `Citation: ${params.citation}. Reported case name: ${params.caseName}.`
    : `Citation: ${params.citation}.`;

  const resp = await fetchImpl(PERPLEXITY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL ?? 'sonar-pro',
      messages: [
        { role: 'system', content: CONFIRM_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Perplexity confirm failed (${resp.status}): ${detail.slice(0, 200)}`);
  }

  const body = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content ?? '';
  return parseConfirmation(content);
}
