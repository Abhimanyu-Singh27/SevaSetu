import { NextResponse } from "next/server";
import { issueEmailVerificationCode } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimit(`auth:resend-verification:${ip}:${email}`, 5, 900);
  if (!limit.allowed) return NextResponse.json({ error: "Too many resend attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const accountLimit = await rateLimit(`auth:resend-verification:email:${email}`, 5, 900);
  if (!accountLimit.allowed) return NextResponse.json({ error: "Too many resend attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSeconds) } });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, emailVerifiedAt: true } });
  if (!user || user.emailVerifiedAt) return NextResponse.json({ error: "No unverified account was found for this email address." }, { status: 404 });

  try {
    const verification = await issueEmailVerificationCode(user.id);
    await sendEmail({ to: email, subject: "Your new SevaSetu verification code", html: `<p>Your new SevaSetu verification code is <strong>${verification.code}</strong>.</p><p>This code expires in 1 minute.</p>` });
    return NextResponse.json({ data: { expiresAt: verification.expiresAt, message: "A new verification code has been sent." } });
  } catch (error) {
    console.error("Verification resend failed", error);
    return NextResponse.json({ error: "Verification email delivery is not configured. Set BREVO_API_KEY or RESEND_API_KEY and EMAIL_FROM, then try again." }, { status: 503 });
  }
}
