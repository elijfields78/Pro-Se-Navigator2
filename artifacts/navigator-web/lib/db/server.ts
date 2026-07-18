/**
 * Server-side Supabase access for API routes.
 *
 * Auth model: the browser holds the Supabase session and sends its access
 * token as a Bearer header. Routes validate the token, then run all queries
 * through a client that carries the same token — so Postgres RLS enforces
 * per-user isolation on every query. The service-role key is never used for
 * user data paths.
 */
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured.`);
  return v;
}

export class AuthError extends Error {
  constructor(message = 'Not authenticated.') {
    super(message);
  }
}

export interface AuthedContext {
  user: User;
  /** RLS-scoped client — queries run as the signed-in user. */
  db: SupabaseClient;
}

/** Validate the Bearer token and return a user-scoped client. */
export async function requireUser(req: Request): Promise<AuthedContext> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AuthError();

  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const db = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new AuthError();
  return { user: data.user, db };
}

/** Uniform error → HTTP mapping for route handlers. */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: 401 });
  }
  const message = err instanceof Error ? err.message : 'Unexpected error.';
  return Response.json({ error: message }, { status: 500 });
}
