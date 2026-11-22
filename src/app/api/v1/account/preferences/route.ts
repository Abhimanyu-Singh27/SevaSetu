import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const supportedLanguages = new Set(["en", "hi"]);

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { preferredLanguage: true } });
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json({ data: user });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const preferredLanguage = String(body.preferredLanguage || "");
  if (!supportedLanguages.has(preferredLanguage)) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  const user = await prisma.user.update({ where: { id: session.userId }, data: { preferredLanguage }, select: { preferredLanguage: true } });
  const response = NextResponse.json({ data: user });
  response.cookies.set("sevasetu-language", preferredLanguage, { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 31536000 });
  return response;
}
