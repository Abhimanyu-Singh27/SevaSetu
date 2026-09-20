import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
    return NextResponse.json({ error: "Administrator setup is unavailable because the database is not connected. Check DATABASE_URL and apply Prisma migrations." }, { status: 503 });
  }
}
