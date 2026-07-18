import { requireUser, toErrorResponse } from '@/lib/db/server';
import { createCase, listCases } from '@/lib/db/cases';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { db } = await requireUser(req);
    return Response.json({ cases: await listCases(db) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { db, user } = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as { title?: string };
    const caseRow = await createCase(db, user.id, body.title?.trim() || 'My case');
    return Response.json({ case: caseRow }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
