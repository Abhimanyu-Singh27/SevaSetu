import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueEmailVerificationCode } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await rateLimit(`auth:register:${ip}`, 5, 3600);
    if (!limit.allowed) return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || "").trim();
    const role = body.role === "WORKER" ? "WORKER" : "CUSTOMER";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    const accountLimit = await rateLimit(`auth:register:email:${email}`, 5, 3600);
    if (!accountLimit.allowed) return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSeconds) } });
    if (password.length < 10) return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
    if (fullName.length < 2 || fullName.length > 120) return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, emailVerifiedAt: true } });
    if (existingUser) {
      if (existingUser.role !== role || existingUser.emailVerifiedAt) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      try {
        const verification = await issueEmailVerificationCode(existingUser.id);
        await sendEmail({ to: email, subject: "Your SevaSetu verification code", html: `<p>Welcome to SevaSetu.</p><p>Your SevaSetu verification code is <strong>${verification.code}</strong>.</p><p>This code expires in 1 minute.</p>` });
        return NextResponse.json({ data: { user: { id: existingUser.id, email, role }, verificationRequired: true, expiresAt: verification.expiresAt, redirectUrl: `/verify-email?email=${encodeURIComponent(email)}` } }, { status: 201 });
      } catch (error) {
        console.error("Verification email retry failed", error);
        return NextResponse.json({ error: "Verification email delivery is not configured. Set BREVO_API_KEY or RESEND_API_KEY and EMAIL_FROM, then try again." }, { status: 503 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...(role === "WORKER" ? { workerProfile: { create: { fullName } } } : { customerProfile: { create: { fullName } } }),
      },
      select: { id: true, email: true, role: true },
    });
    let verification: Awaited<ReturnType<typeof issueEmailVerificationCode>>;
    try {
      verification = await issueEmailVerificationCode(user.id);
      await sendEmail({ to: user.email, subject: "Your SevaSetu verification code", html: `<p>Welcome to SevaSetu.</p><p>Your SevaSetu verification code is <strong>${verification.code}</strong>.</p><p>This code expires in 1 minute.</p>` });
    } catch (error) {
      console.error("Verification email delivery failed", error);
      await prisma.user.delete({ where: { id: user.id } });
      return NextResponse.json({ error: "Verification email delivery is not configured. Set BREVO_API_KEY or RESEND_API_KEY and EMAIL_FROM, then try again." }, { status: 503 });
    }
    return NextResponse.json({ data: { user, verificationRequired: true, expiresAt: verification.expiresAt, redirectUrl: `/verify-email?email=${encodeURIComponent(user.email)}` } }, { status: 201 });
  } catch (error) {
    console.error("Registration failed", error);
    const message = process.env.NODE_ENV === "production"
      ? "Unable to create account. Please try again later."
      : "Unable to create account because the database is unavailable. Start PostgreSQL and try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
