import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimit(`auth:reset:${ip}`, 5, 3600);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (password.length < 10) return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
  const record = await consumeAuthToken(token, "PASSWORD_RESET");
  if (!record) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  return NextResponse.json({ data: { reset: true, redirectUrl: "/login?reset=success" } });
}
