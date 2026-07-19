/**
 * Phase 1 — Story Intake endpoint. Takes the user's story (possibly grown
 * across several messages), runs the intake pipeline (silent extraction +
 * neutral narrative + gap-filler questions), persists the draft narrative,
 * and returns it for user approval. Approval is a separate, explicit step.
 */
import { requireUser, toErrorResponse } from '@/lib/db/server';
import { saveIntakeResult } from '@/lib/db/cases';
import { runStoryIntake, anthropicLlm } from '@/lib/workflows/storyIntake';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await requireUser(req);
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { story?: string };
    const story = typeof body.story === 'string' ? body.story.trim().slice(0, 20000) : '';
    if (!story) return Response.json({ error: 'story is required' }, { status: 400 });
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 503 });
    }

    const result = await runStoryIntake(story, anthropicLlm());

    // Derive a short case title from the extraction (first defendant), if any.
    const defendant = result.extraction.who[0];
    const title = defendant ? `Dispute with ${defendant}` : undefined;

    await saveIntakeResult(db, user.id, id, {
      narrative: result.narrative,
      extraction: result.extraction,
      questions: result.questions,
      title,
    });

    return Response.json({
      narrative: result.narrative,
      questions: result.questions,
      extraction: result.extraction,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
