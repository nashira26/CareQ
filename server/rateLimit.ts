/**
 * Simple in-memory fixed-window rate limiter (per server process; fine for one Render instance).
 */
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs = 60_000, now = Date.now()): { ok: boolean; retryAfterSeconds: number } {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  b.count += 1;
  return b.count <= max ? { ok: true, retryAfterSeconds: 0 } : { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
}

/** Forget expired windows now and then so memory stays small. */
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60_000).unref();

export const AI_LIMIT_PER_SESSION = 20; // per minute, signed in
export const AI_LIMIT_ANON_ASK = 10; // per minute per IP, anonymous Ask CareQ
export const RATE_LIMIT_MESSAGE = "You've used CareQ's AI features a lot in the last minute. Please wait a moment and try again.";
