import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSession, roleHome, type AppRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await rateLimit(`auth:login:${ip}`, 10, 900);
    if (!limit.allowed) return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    const accountLimit = await rateLimit(`auth:login:email:${email}`, 10, 900);
    if (!accountLimit.allowed) return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(accountLimit.retryAfterSeconds) } });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true, role: true, status: true, emailVerifiedAt: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (user.status !== "ACTIVE") return NextResponse.json({ error: "This account is not currently active" }, { status: 403 });
    if (!user.emailVerifiedAt) return NextResponse.json({ error: "Please verify your email before signing in." }, { status: 403 });
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    const role = user.role as AppRole;
    await setSession({ userId: user.id, email: user.email, role });
    return NextResponse.json({ data: { user: { id: user.id, email: user.email, role }, redirectUrl: roleHome(role) } });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 });
  }
}