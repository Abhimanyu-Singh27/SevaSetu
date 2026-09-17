type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") throw new Error("Rate limiting is not configured");
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", key], ["EXPIRE", key, windowSeconds]]),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Rate limiting service unavailable");
  const result = await response.json() as Array<{ result?: number }>;
  const count = Number(result[0]?.result || 0);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds: count > limit ? windowSeconds : 0 };
}
