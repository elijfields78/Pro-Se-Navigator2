import { requireUser, toErrorResponse } from '@/lib/db/server';
import { getCaseBundle } from '@/lib/db/cases';
import { COLD_START_PHASES } from '@/lib/workflows/coldStart';

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await requireUser(req);
    const { id } = await ctx.params;
    const bundle = await getCaseBundle(db, id);
    const phaseDef = COLD_START_PHASES.find((p) => p.id === bundle.phase.phase);
    return Response.json({
      case: bundle.caseRow,
      phase: bundle.phase.phase,
      phaseTitle: phaseDef?.title ?? bundle.phase.phase,
      missing: bundle.missing,
      evidenceCount: bundle.evidenceCount,
      intakeQuestions: (bundle.phase.gate_artifacts?.['intakeQuestions'] as string[]) ?? [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
