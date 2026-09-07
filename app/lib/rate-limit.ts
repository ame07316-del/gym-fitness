type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 10 * 60_000;
const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function clientKey(request: Request) {
  // On Vercel/Nginx these are set by the trusted proxy. In a direct local
  // request, all clients intentionally fall back to one bounded bucket.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return (real || forwarded || "local").slice(0, 100);
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value as string | undefined;
    if (!oldest) break;
    buckets.delete(oldest);
  }
}

export function checkRateLimit(request: Request, scope: string, limit: number) {
  const now = Date.now();
  prune(now);
  const key = `${scope}:${clientKey(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 } as const;
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) } as const;
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 } as const;
}
