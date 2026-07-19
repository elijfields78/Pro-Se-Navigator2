import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: string;
}

// Short-TTL verification cache: successive requests from the same session
// re-use one Supabase round-trip instead of one per request. Revocation lag is
// bounded by the TTL. Size-capped so hostile token spraying can't grow it.
const TOKEN_CACHE_TTL_MS = 30_000;
const TOKEN_CACHE_MAX = 1000;
const tokenCache = new Map<string, { userId: string; expiresAt: number }>();

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

  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > now) return cached.userId;

  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as { id?: string };
    if (!body.id) return null;

    if (tokenCache.size >= TOKEN_CACHE_MAX) {
      // Drop expired entries first; if still full, drop the oldest insertion.
      for (const [k, v] of tokenCache) {
        if (v.expiresAt <= now) tokenCache.delete(k);
      }
      if (tokenCache.size >= TOKEN_CACHE_MAX) {
        const oldest = tokenCache.keys().next().value;
        if (oldest) tokenCache.delete(oldest);
      }
    }
    tokenCache.set(token, { userId: body.id, expiresAt: now + TOKEN_CACHE_TTL_MS });
    return body.id;
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
