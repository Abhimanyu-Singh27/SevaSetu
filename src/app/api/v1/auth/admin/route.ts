import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSession, roleHome, type AppRole } from "@/lib/auth";
import { issueAuthToken } from "@/lib/auth-tokens";
import { appUrl, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { decryptMfaSecret, verifyTotp } from "@/lib/mfa";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await rateLimit(`auth:admin:${ip}`, 10, 900);
    if (!limit.allowed) return NextResponse.json({ error: "Too many administrator access attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const body = await request.json();
    const action = body.action === "login" ? "login" : "create";
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || "").trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });

    const activeAdmin = await prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() }, user: { role: "ADMIN", status: "ACTIVE" } } });
    if (activeAdmin > 0) return NextResponse.json({ error: "An administrator is already signed in. Sign out before using administrator access." }, { status: 409 });

    if (action === "create") {
      if (password.length < 10) return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
      if (fullName.length < 2 || fullName.length > 120) return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
      if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({ data: { email, displayName: fullName, passwordHash, role: "ADMIN", status: "ACTIVE" }, select: { id: true, email: true, displayName: true, role: true } });
      const token = await issueAuthToken(user.id, "EMAIL_VERIFICATION", 24 * 60 * 60 * 1000);
      await sendEmail({ to: user.email, subject: "Verify your SevaSetu administrator email", html: `<p><a href="${appUrl()}/verify-email?token=${encodeURIComponent(token)}">Verify administrator email</a></p>` });
      return NextResponse.json({ data: { user, verificationRequired: true, redirectUrl: "/login?verified=pending" } }, { status: 201 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, displayName: true, passwordHash: true, role: true, status: true, emailVerifiedAt: true, mfaEnabled: true, mfaSecret: true } });
    if (!user || user.role !== "ADMIN" || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "Invalid administrator email or password" }, { status: 401 });
    if (user.status !== "ACTIVE") return NextResponse.json({ error: "This account is not currently active" }, { status: 403 });
    if (!user.emailVerifiedAt) return NextResponse.json({ error: "Please verify your email before signing in." }, { status: 403 });
    if (user.mfaEnabled && (!user.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), String(body.otp || "")))) return NextResponse.json({ error: "A valid authenticator code is required.", code: "MFA_REQUIRED" }, { status: 401 });
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    await setSession({ userId: user.id, email: user.email, role: "ADMIN" });
    return NextResponse.json({ data: { user: { id: user.id, email: user.email, role: "ADMIN" as AppRole }, redirectUrl: roleHome("ADMIN") } });
  } catch (error) {
    console.error("Administrator access failed", error);
    return NextResponse.json({ error: "Unable to process administrator access" }, { status: 500 });
  }
}
