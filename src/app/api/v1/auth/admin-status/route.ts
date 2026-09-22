import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL is missing from the deployed environment. Add it to Vercel Production variables and redeploy." }, { status: 503 });
  try {
    const now = new Date();
    const [adminExists, activeAdmin] = await Promise.all([
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.session.count({
        where: { revokedAt: null, expiresAt: { gt: now }, user: { role: "ADMIN", status: "ACTIVE" } },
      }),
    ]);
    return NextResponse.json({ adminExists: adminExists > 0, activeAdmin: activeAdmin > 0 });
  } catch (error) {
    console.error("Administrator status check failed", error);
    const details = error instanceof Error ? error.message : "";
    console.error("Administrator status database diagnostics", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown",
      message: details,
    });
    return NextResponse.json({ error: "DATABASE_URL is set, but the deployed app cannot reach the database. Check the production connection string, SSL settings, network access, and Prisma migrations." }, { status: 503 });
  }
}
