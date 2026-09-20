import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueAuthToken } from "@/lib/auth-tokens";
import { appUrl, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimit(`auth:forgot:${ip}`, 5, 3600);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  const accountLimit = await rateLimit(`auth:forgot:email:${email}`, 5, 3600);
  if (!accountLimit.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSeconds) } });
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (user) {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET", 30 * 60 * 1000);
    await sendEmail({ to: user.email, subject: "Reset your SevaSetu password", html: `<p><a href="${appUrl()}/reset-password?token=${encodeURIComponent(token)}">Reset your password</a></p><p>This link expires in 30 minutes.</p>` });
  }
  return NextResponse.json({ data: { message: "If an account exists for that email, reset instructions have been sent." } });
}
