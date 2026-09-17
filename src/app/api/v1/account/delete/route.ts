import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "Password confirmation failed" }, { status: 403 });

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id: session.userId }, data: { status: "DEACTIVATED", email: `deleted-${randomUUID()}@deleted.sevasetu.local`, displayName: null, phone: null, emailVerifiedAt: null, mfaEnabled: false, mfaSecret: null } });
    await transaction.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await transaction.auditLog.create({ data: { actorId: session.userId, action: "ACCOUNT_DEACTIVATED", targetType: "USER", targetId: session.userId } });
  });

  return NextResponse.json({ data: { deleted: true } });
}
