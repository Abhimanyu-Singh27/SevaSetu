import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSession, roleHome, type AppRole } from "@/lib/auth";
import { issueEmailVerificationCode } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { decryptMfaSecret, verifyTotp } from "@/lib/mfa";

export const runtime = "nodejs";

function configurationError() {
  if (!process.env.DATABASE_URL) return "Database configuration is missing. Set DATABASE_URL and try again.";
  if (process.env.NODE_ENV === "production" && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) return "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, then try again.";
  return null;
}

function matchesBootstrapSecret(value: string) {
  const configured = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!configured && process.env.NODE_ENV !== "production") return value === "local-admin-bootstrap";
  if (!configured || !value) return false;
  return timingSafeEqual(createHash("sha256").update(value).digest(), createHash("sha256").update(configured).digest());
}

export async function POST(request: Request) {
  try {
    const configurationMessage = configurationError();
    if (configurationMessage) return NextResponse.json({ error: configurationMessage }, { status: 503 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await rateLimit(`auth:admin:${ip}`, 10, 900);
    if (!limit.allowed) return NextResponse.json({ error: "Too many administrator access attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const body = await request.json();
    const action = body.action === "login" ? "login" : "create";
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || "").trim();
    const bootstrapSecret = String(body.bootstrapSecret || "");

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });
    const accountLimit = await rateLimit(`auth:admin:email:${email}`, 10, 900);
    if (!accountLimit.allowed) return NextResponse.json({ error: "Too many administrator access attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSeconds) } });

    if (action === "create") {
      if (!matchesBootstrapSecret(bootstrapSecret)) return NextResponse.json({ error: "Administrator creation requires the configured bootstrap secret." }, { status: 403 });
      if (password.length < 10) return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
      if (fullName.length < 2 || fullName.length > 120) return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
      if (await prisma.user.count({ where: { role: "ADMIN" } })) return NextResponse.json({ error: "Administrator creation is disabled because an administrator already exists. Sign in instead." }, { status: 409 });
      const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, emailVerifiedAt: true, displayName: true } });
      if (existingUser) {
        if (existingUser.role !== "ADMIN" || existingUser.emailVerifiedAt) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
        try {
          const verification = await issueEmailVerificationCode(existingUser.id);
          await sendEmail({ to: email, subject: "Your SevaSetu administrator verification code", html: `<p>Your administrator email verification code is <strong>${verification.code}</strong>.</p><p>This code expires in 1 minute.</p>` });
          return NextResponse.json({ data: { user: { id: existingUser.id, email, displayName: existingUser.displayName, role: "ADMIN" }, verificationRequired: true, expiresAt: verification.expiresAt, redirectUrl: `/verify-email?email=${encodeURIComponent(email)}` } }, { status: 201 });
        } catch (error) {
          console.error("Administrator verification email retry failed", error);
          return NextResponse.json({ error: "Verification email could not be sent. Check BREVO_API_KEY, EMAIL_FROM, and that EMAIL_FROM is a verified Brevo sender, then try again." }, { status: 503 });
        }
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({ data: { email, displayName: fullName, passwordHash, role: "ADMIN", status: "ACTIVE" }, select: { id: true, email: true, displayName: true, role: true } });
      let verification: Awaited<ReturnType<typeof issueEmailVerificationCode>>;
      try {
        verification = await issueEmailVerificationCode(user.id);
        await sendEmail({ to: user.email, subject: "Your SevaSetu administrator verification code", html: `<p>Your administrator email verification code is <strong>${verification.code}</strong>.</p><p>This code expires in 1 minute.</p>` });
      } catch (error) {
        console.error("Administrator verification email failed", error);
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json({ error: "Verification email could not be sent. Check BREVO_API_KEY, EMAIL_FROM, and that EMAIL_FROM is a verified Brevo sender, then try again." }, { status: 503 });
      }
      return NextResponse.json({ data: { user, verificationRequired: true, expiresAt: verification.expiresAt, redirectUrl: `/verify-email?email=${encodeURIComponent(user.email)}` } }, { status: 201 });
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
    if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && error.code.startsWith("P")) {
      return NextResponse.json({ error: "Administrator access is unavailable because the database is not connected or migrations are missing. Check DATABASE_URL and run Prisma migrations." }, { status: 503 });
    }
    const message = process.env.NODE_ENV === "production"
      ? "Unable to process administrator access. Check DATABASE_URL, Redis rate-limit configuration, and the deployment logs."
      : "Unable to process administrator access because the database or local services are unavailable. Start PostgreSQL and Redis, then try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
