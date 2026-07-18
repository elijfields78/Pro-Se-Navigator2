import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory fixed-window limiter. Adequate for a single-instance Express server
// (the current Replit deployment). If the API is ever horizontally scaled, move
// this to a shared store (e.g. Redis) so limits are enforced across instances.
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { windowMs: number; max: number }) {
  const { windowMs, max } = opts;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();

    // Opportunistic sweep so the map can't grow without bound under many IPs.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (now > b.resetAt) buckets.delete(k);
      }
    }

    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "rate_limited", retryAfterSeconds: retryAfter });
      return;
    }

    next();
  };
}
