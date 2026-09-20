import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession(); if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  return NextResponse.json({ data: await prisma.disputeCase.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "INVESTIGATING"] } }, orderBy: { createdAt: "asc" }, include: { request: { include: { service: true, customer: true, worker: true } } } }) });
}

export async function PATCH(request: Request) {
  const session = await getSession(); if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const body = await request.json().catch(() => ({})); const status = ["UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "REJECTED"].includes(body.status) ? body.status : null;
  if (!status || !body.id) return NextResponse.json({ error: "Dispute id and valid status are required" }, { status: 400 });
  const dispute = await prisma.disputeCase.update({ where: { id: body.id }, data: { status, resolution: body.resolution ? String(body.resolution).slice(0, 1000) : undefined, resolvedBy: ["RESOLVED", "REJECTED"].includes(status) ? session.userId : undefined, resolvedAt: ["RESOLVED", "REJECTED"].includes(status) ? new Date() : undefined } });
  await prisma.auditLog.create({ data: { actorId: session.userId, action: "DISPUTE_UPDATED", targetType: "DISPUTE", targetId: dispute.id, metadata: { status } } });
  return NextResponse.json({ data: dispute });
}
