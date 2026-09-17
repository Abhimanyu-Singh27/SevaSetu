import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOtpAuthUrl, decryptMfaSecret, encryptMfaSecret, generateMfaSecret, verifyTotp } from "@/lib/mfa";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true, passwordHash: true, mfaEnabled: true, mfaSecret: true } });
  if (!user) return NextResponse.json({ error: "Administrator account not found" }, { status: 404 });

  if (action === "setup") {
    const secret = generateMfaSecret();
    await prisma.user.update({ where: { id: session.userId }, data: { mfaSecret: encryptMfaSecret(secret), mfaEnabled: false } });
    return NextResponse.json({ data: { secret, otpauthUrl: createOtpAuthUrl(secret, user.email) } });
  }

  if (action === "confirm") {
    if (!user.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), String(body.code || ""))) return NextResponse.json({ error: "Enter a valid authenticator code" }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { id: session.userId }, data: { mfaEnabled: true } }),
      prisma.auditLog.create({ data: { actorId: session.userId, action: "ADMIN_MFA_ENABLED", targetType: "USER", targetId: session.userId } }),
    ]);
    return NextResponse.json({ data: { enabled: true } });
  }

  if (action === "disable") {
    if (!(await bcrypt.compare(String(body.password || ""), user.passwordHash)) || !user.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), String(body.code || ""))) return NextResponse.json({ error: "Password and authenticator code are required" }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { id: session.userId }, data: { mfaEnabled: false, mfaSecret: null } }),
      prisma.auditLog.create({ data: { actorId: session.userId, action: "ADMIN_MFA_DISABLED", targetType: "USER", targetId: session.userId } }),
    ]);
    return NextResponse.json({ data: { enabled: false } });
  }

  return NextResponse.json({ error: "Unsupported MFA action" }, { status: 400 });
}
