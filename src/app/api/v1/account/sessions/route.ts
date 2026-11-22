import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/portal-api";

export async function DELETE() {
  const session = await getSession();
  if (!session?.sessionId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const result = await prisma.session.updateMany({ where: { userId: session.userId, id: { not: session.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
    return NextResponse.json({ data: { revoked: result.count } });
  } catch (error) { return apiError(error); }
}
