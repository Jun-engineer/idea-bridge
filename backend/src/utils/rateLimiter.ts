const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

function makeKey(userId: string, action: string): string {
  return `${userId}:${action}`;
}

export function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const key = makeKey(userId, action);
  const now = Date.now();
  const windowStart = now - windowMs;
  const history = buckets.get(key) ?? [];
  const recent = history.filter((timestamp) => timestamp >= windowStart);

  if (recent.length >= limit) {
    const oldest = recent[0];
    return {
      allowed: false,
      retryAfterMs: Math.max(0, windowMs - (now - oldest)),
    };
  }

  recent.push(now);
  buckets.set(key, recent);
  return {
    allowed: true,
    retryAfterMs: 0,
  };
}

export function resetRateLimit(userId: string, action: string) {
  const key = makeKey(userId, action);
  buckets.delete(key);
}
