import { NextResponse } from "next/server";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  const limit = await rateLimit(`auth:verify-email:${ip}:${email}`, 8, 900);
  if (!limit.allowed) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the email address and six-digit verification code." }, { status: 400 });
  const accountLimit = await rateLimit(`auth:verify-email:email:${email}`, 8, 900);
  if (!accountLimit.allowed) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSeconds) } });
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const record = user ? await consumeAuthToken(code, "EMAIL_VERIFICATION", user.id) : null;
  if (!record) return NextResponse.json({ error: "That verification code is invalid or expired." }, { status: 400 });
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  return NextResponse.json({ data: { verified: true, redirectUrl: "/login?verified=success" } });
}
