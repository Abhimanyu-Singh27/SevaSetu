import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession(); if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const entries = await prisma.financialEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, userId: true, requestId: true, type: true, amount: true, currency: true, reference: true, createdAt: true } });
  const totals = entries.reduce<Record<string, number>>((result, entry) => ({ ...result, [entry.type]: (result[entry.type] || 0) + Number(entry.amount) }), {});
  return NextResponse.json({ data: entries, totals });
}

export async function POST(request: Request) {
  const session = await getSession(); if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const body = await request.json().catch(() => ({})); const type = ["EARNING", "PLATFORM_FEE", "REFUND", "PAYOUT"].includes(body.type) ? body.type : null; const amount = Number(body.amount);
  if (!type || !body.userId || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Valid user, type, and amount are required" }, { status: 400 });
  const entry = await prisma.financialEntry.create({ data: { userId: String(body.userId), requestId: body.requestId || undefined, type, amount, reference: body.reference ? String(body.reference).slice(0, 120) : undefined } });
  return NextResponse.json({ data: entry }, { status: 201 });
}
