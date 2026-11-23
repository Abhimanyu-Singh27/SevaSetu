type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") throw new Error("Rate limiting is not configured");
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  let response: Response;
  try {
    response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, windowSeconds]]),
      cache: "no-store",
    });
  } catch {
    throw new Error("Rate limiting service unavailable");
  }
  if (!response.ok) throw new Error(`Rate limiting service unavailable (HTTP ${response.status})`);
  let result: Array<{ result?: unknown; error?: string }>;
  try {
    result = await response.json() as Array<{ result?: unknown; error?: string }>;
  } catch {
    throw new Error("Rate limiting service unavailable");
  }
  if (!Array.isArray(result) || result.some((item) => item?.error)) throw new Error("Rate limiting service unavailable");
  const count = Number(result[0]?.result || 0);
  if (!Number.isFinite(count)) throw new Error("Rate limiting service unavailable");
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds: count > limit ? windowSeconds : 0 };
}
