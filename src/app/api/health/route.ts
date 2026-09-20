import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ready = process.env.NODE_ENV !== "production" || Object.values(configuration).every(Boolean);
    return NextResponse.json({
      status: ready ? "ok" : "degraded",
      checks: { database: "ok", configuration },
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, { status: ready ? 200 : 503 });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        checks: { database: "unavailable" },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}