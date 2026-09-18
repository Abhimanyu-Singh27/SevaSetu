import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const [adminExists, activeAdmin] = await Promise.all([
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.session.findFirst({
      where: { revokedAt: null, expiresAt: { gt: now }, user: { role: "ADMIN", status: "ACTIVE" } },
      select: { user: { select: { displayName: true, email: true } } },
    }),
  ]);
  return NextResponse.json({ adminExists: adminExists > 0, activeAdmin: Boolean(activeAdmin), activeAdminName: activeAdmin?.user.displayName || activeAdmin?.user.email || null });
}
