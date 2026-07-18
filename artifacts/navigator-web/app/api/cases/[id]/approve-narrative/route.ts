/**
 * The Phase 1 gate action: the user approves the structured fact narrative.
 * On approval the FSM attempts to advance (server-side, from stored state —
 * the client can never skip a phase).
 */
import { requireUser, toErrorResponse } from '@/lib/db/server';
import { approveNarrative } from '@/lib/db/cases';
import { COLD_START_PHASES } from '@/lib/workflows/coldStart';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await requireUser(req);
    const { id } = await ctx.params;
    const result = await approveNarrative(db, user.id, id);
    const phaseDef = COLD_START_PHASES.find((p) => p.id === result.phase);
    return Response.json({
      phase: result.phase,
      phaseTitle: phaseDef?.title ?? result.phase,
      missing: result.missing,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
