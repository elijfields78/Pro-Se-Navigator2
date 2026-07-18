/**
 * Phase 1 — Story Intake.
 *
 * The app listens first: the user tells the story in their own words, no
 * interruptions, no legal vocabulary. Extraction happens silently (who /
 * what / when / where / harm / prior contact / mentioned deadlines), then a
 * SMALL number of targeted gap-filler questions — never cross-examination,
 * and never legal theory (that is Phase 3's job).
 *
 * The LLM caller is injectable; extraction output is validated with zod so a
 * malformed model response can never corrupt the narrative artifact.
 */

import { z } from 'zod';

export const StoryExtractionSchema = z.object({
  who: z.array(z.string()).default([]), // defendants, by best available name
  what: z.string().default(''), // the specific acts or omissions
  when: z.array(z.string()).default([]), // dates or approximate dates
  where: z.string().default(''), // state / interstate context
  harm: z.array(z.string()).default([]), // money, credit, injury, distress, opportunity
  priorContact: z.array(z.string()).default([]),
  mentionedDeadlines: z.array(z.string()).default([]),
});
export type StoryExtraction = z.infer<typeof StoryExtractionSchema>;

export interface IntakeResult {
  extraction: StoryExtraction;
  /** Neutral, legally-clean narrative summary. Original words are preserved separately. */
  narrative: string;
  /** Gap-filler questions for anything extraction could not anchor. */
  questions: string[];
}

/** LLM caller: (system, user) -> raw text. Injectable for tests. */
export type LlmCall = (system: string, user: string) => Promise<string>;

const EXTRACT_SYSTEM = `You are the intake listener for a legal self-help tool. The user has just told their story. Extract, without adding or interpreting law:
- who: the people/entities the user says wronged them
- what: the specific acts or omissions, in neutral language
- when: every date or approximate date mentioned
- where: the state(s) where events occurred, and whether interstate commerce is involved
- harm: each kind of harm mentioned (money lost, credit damage, injury, distress, opportunity)
- priorContact: letters, calls, emails, complaints the user already made
- mentionedDeadlines: any deadline mentioned in passing (30-day letter, lease term, notice period)
Respond with ONLY a JSON object with exactly those keys (arrays of strings, except "what" and "where" which are strings). No legal terms of art. No commentary.`;

const NARRATIVE_SYSTEM = `You summarize a person's story into a structured fact narrative for later legal work. Neutral, plain, legally-clean language. Chronological. No legal conclusions, no statute names, no advice. 150-300 words.`;

/** The five gap-filler anchors from Cold-Start §3.2, asked only when missing. */
export function gapFillerQuestions(x: StoryExtraction): string[] {
  const q: string[] = [];
  if (x.when.length === 0) q.push('Do you remember approximately when this first happened?');
  if (x.who.length <= 1) q.push('Is that the only person or company involved, or were others?');
  if (!x.where) q.push('Where do you live right now (city and state)?');
  if (!x.priorContact.some((p) => /agreement|contract|signed|arbitration/i.test(p)) &&
      !/agreement|contract|signed|arbitration/i.test(x.what)) {
    q.push('Have you signed anything with them, like an account agreement or terms with an arbitration clause?');
  }
  if (!x.harm.some((h) => /\$|dollar|money|amount|\d/.test(h))) {
    q.push('How much money, roughly, are you out because of this?');
  }
  return q;
}

function parseExtraction(raw: string): StoryExtraction {
  // Models sometimes wrap JSON in code fences — strip before parsing.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return StoryExtractionSchema.parse({});
  try {
    return StoryExtractionSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));
  } catch {
    return StoryExtractionSchema.parse({});
  }
}

export async function runStoryIntake(story: string, llm: LlmCall): Promise<IntakeResult> {
  const extraction = parseExtraction(await llm(EXTRACT_SYSTEM, story));
  const narrative = (await llm(NARRATIVE_SYSTEM, story)).trim();
  return { extraction, narrative, questions: gapFillerQuestions(extraction) };
}

/** Default Anthropic-backed caller (strongest available model — intake quality
 *  shapes everything downstream). */
export function anthropicLlm(): LlmCall {
  return async (system, user) => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  };
}
