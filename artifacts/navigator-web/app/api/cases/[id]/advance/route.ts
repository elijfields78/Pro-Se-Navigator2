/**
 * Generic gate check / advance attempt for the current phase. Artifacts are
 * always recomputed server-side from stored rows — the FSM never trusts the
 * client. Blocked attempts return the missing gate items so the UI can show
 * exactly what stands between the user and the next phase.
 */
import { requireUser, toErrorResponse } from '@/lib/db/server';
import { getCaseBundle, computeArtifacts, tryAdvance } from '@/lib/db/cases';
import { COLD_START_PHASES } from '@/lib/workflows/coldStart';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await requireUser(req);
    const { id } = await ctx.params;

    const bundle = await getCaseBundle(db, id);
    const artifacts = computeArtifacts(bundle.caseRow, bundle.phase, bundle.theories, bundle.evidenceCount);
    const result = tryAdvance(bundle.phase.phase, artifacts);

    if (result.advanced && !result.finished && result.phase !== bundle.phase.phase) {
      const { error } = await db
        .from('nav_case_phase_state')
        .update({ phase: result.phase, updated_at: new Date().toISOString() })
        .eq('case_id', id);
      if (error) throw error;
      await db.from('nav_memory_events').insert({
        case_id: id,
        user_id: user.id,
        kind: 'durable_fact',
        content: `Case advanced to ${result.phase}.`,
      });
    }

    const phaseDef = COLD_START_PHASES.find((p) => p.id === result.phase);
    return Response.json({
      advanced: result.advanced,
      finished: result.finished,
      phase: result.phase,
      phaseTitle: phaseDef?.title ?? result.phase,
      missing: result.missing,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
