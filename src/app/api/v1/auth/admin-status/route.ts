import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const [adminExists, activeAdmin] = await Promise.all([
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.session.count({
      where: { revokedAt: null, expiresAt: { gt: now }, user: { role: "ADMIN", status: "ACTIVE" } },
    }),
  ]);
  return NextResponse.json({ adminExists: adminExists > 0, activeAdmin: activeAdmin > 0 });
}
