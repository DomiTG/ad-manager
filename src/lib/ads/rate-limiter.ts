// Simple in-memory rate limiter for ad event endpoints
// For production, replace with Redis-backed rate limiting (e.g., upstash/ratelimit)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

// Start cleanup interval lazily on first use to avoid issues in serverless/HMR environments
function ensureCleanup(): void {
  if (cleanupInterval !== null) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);
}

/**
 * Check rate limit for a given key.
 * Returns { allowed: true } if under the limit, { allowed: false, retryAfter } if exceeded.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = parseInt(process.env.AD_RATE_LIMIT_REQUESTS || "10"),
  windowMs: number = parseInt(process.env.AD_RATE_LIMIT_WINDOW_MS || "60000")
): { allowed: boolean; retryAfter?: number } {
  ensureCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}
