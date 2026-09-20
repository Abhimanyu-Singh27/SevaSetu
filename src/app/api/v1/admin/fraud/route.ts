import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession(); if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  return NextResponse.json({ data: await prisma.fraudSignal.findMany({ where: { status: "OPEN" }, orderBy: [{ score: "desc" }, { createdAt: "desc" }], take: 100 }) });
}

export async function PATCH(request: Request) {
  const session = await getSession(); if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const body = await request.json().catch(() => ({})); const status = ["REVIEWED", "DISMISSED", "CONFIRMED"].includes(body.status) ? body.status : null;
  if (!status || !body.id) return NextResponse.json({ error: "Signal id and valid status are required" }, { status: 400 });
  const signal = await prisma.fraudSignal.update({ where: { id: body.id }, data: { status } });
  await prisma.auditLog.create({ data: { actorId: session.userId, action: "FRAUD_SIGNAL_REVIEWED", targetType: "FRAUD_SIGNAL", targetId: signal.id, metadata: { status } } });
  return NextResponse.json({ data: signal });
}
