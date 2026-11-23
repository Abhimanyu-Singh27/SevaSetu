import { NextResponse } from "next/server";
import { databaseDiagnostics, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function databaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "unknown";
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("errorCode" in error && typeof error.errorCode === "string") return error.errorCode;
  return "unknown";
}

function databaseFailureKind(error: unknown, code: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (code === "P1000" || /authentication failed|password authentication failed|invalid database credentials/.test(message)) return "credentials_rejected";
  if (code === "P1003" || /database .* does not exist/.test(message)) return "database_not_found";
  if (code === "P1010" || /permission denied|access denied/.test(message)) return "database_access_denied";
  if (/certificate|ssl|tls handshake/.test(message)) return "tls_failure";
  if (/query engine|libquery_engine|engine binary|failed to start.*engine/.test(message)) return "prisma_engine_startup_failure";
  if (/can't reach database|timed out|econnrefused|econnreset|enotfound|connection.*closed/.test(message) || ["P1001", "P1002", "P1008", "P1017"].includes(code)) return "network_or_connection_failure";
  return "unclassified_initialization_failure";
}

function safeDatabaseErrorDetail(error: unknown) {
  if (!(error instanceof Error)) return "Unknown database error";
  return error.message
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "[redacted database URL]")
    .replace(/\b(password|token|secret|api[-_ ]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 320);
}

type RateLimitHealth = { status: "ok" | "not_configured" | "unavailable"; httpStatus?: number };

async function checkRateLimitService(): Promise<RateLimitHealth> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { status: "not_configured" };

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["PING"]]),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return { status: "unavailable", httpStatus: response.status };
    const result = await response.json() as Array<{ result?: string; error?: string }>;
    if (!Array.isArray(result) || result[0]?.result !== "PONG" || result[0]?.error) return { status: "unavailable" };
    return { status: "ok" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function GET() {
  const startedAt = Date.now();
  const configuration = {
    session: Boolean(process.env.SESSION_SECRET),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    rateLimit: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    email: Boolean((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.EMAIL_FROM),
    storage: Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
    uploadScanner: Boolean(process.env.UPLOAD_SCANNER_URL),
    realtime: Boolean(process.env.WEBSOCKET_PUBLISH_URL || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)),
  };
  const database = databaseDiagnostics();
  const rateLimitHealth = await checkRateLimitService();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const coreReady = configuration.session && configuration.appUrl && configuration.rateLimit && rateLimitHealth.status === "ok";
    const ready = process.env.NODE_ENV !== "production" || coreReady;
    return NextResponse.json({
      status: ready ? "ok" : "degraded",
      checks: { database: "ok", rateLimit: rateLimitHealth, configuration, connection: database },
      optionalCapabilities: { email: configuration.email, storage: configuration.storage, uploadScanner: configuration.uploadScanner, realtime: configuration.realtime },
      release: { nodeEnv: process.env.NODE_ENV || "development", version: process.env.npm_package_version || "unknown", commit: process.env.VERCEL_GIT_COMMIT_SHA || "local" },
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, { status: ready ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = databaseErrorCode(error);
    const failureKind = databaseFailureKind(error, code);
    const reason = message.includes("required") || message.includes("invalid") || message.includes("protocol") || message.includes("localhost")
      ? "invalid_database_url"
      : "database_unreachable";
    console.error("Health database check failed", {
      reason,
      name: error instanceof Error ? error.name : "UnknownError",
      code,
      failureKind,
      message,
    });
    return NextResponse.json(
      {
        status: "degraded",
        checks: { database: "unavailable", rateLimit: rateLimitHealth, reason, code, connection: database },
        databaseError: {
          name: error instanceof Error ? error.name : "UnknownError",
          failureKind,
          detail: safeDatabaseErrorDetail(error),
        },
        release: { commit: process.env.VERCEL_GIT_COMMIT_SHA || "local" },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
