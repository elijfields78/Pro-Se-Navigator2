import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Verify a Supabase access token by asking Supabase's auth API who it belongs
 * to. This checks the signature and expiry server-side without us holding the
 * JWT secret. Returns the user id, or null if the token is missing/invalid or
 * the server isn't configured with Supabase credentials.
 */
export async function verifySupabaseToken(token: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as { id?: string };
    return body.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Auth middleware. When a valid bearer token is present, attaches `userId` to
 * the request. When `required` is true, rejects requests without a valid token
 * (401). Toggled per-route so public endpoints can opt in as the mobile client
 * begins attaching its Supabase session token (Phase 6).
 */
export function requireAuth(opts: { required: boolean }) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      if (opts.required) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      return next();
    }

    const userId = await verifySupabaseToken(token);
    if (!userId) {
      if (opts.required) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      return next();
    }

    req.userId = userId;
    next();
  };
}
