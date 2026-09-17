import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { id: session.userId, status: "ACTIVE" }, select: { id: true, email: true, role: true, customerProfile: true, workerProfile: true } });
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json({ data: user });
}