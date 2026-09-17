import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueAuthToken } from "@/lib/auth-tokens";
import { appUrl, sendEmail } from "@/lib/email";
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
    if (password.length < 10) return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
    if (fullName.length < 2 || fullName.length > 120) return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

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
    const token = await issueAuthToken(user.id, "EMAIL_VERIFICATION", 24 * 60 * 60 * 1000);
    await sendEmail({ to: user.email, subject: "Verify your SevaSetu email", html: `<p>Welcome to SevaSetu.</p><p><a href="${appUrl()}/verify-email?token=${encodeURIComponent(token)}">Verify your email address</a></p><p>This link expires in 24 hours.</p>` });
    return NextResponse.json({ data: { user, verificationRequired: true, redirectUrl: "/login?verified=pending" } }, { status: 201 });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
  }
}
