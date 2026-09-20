import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params; const body = await request.json().catch(() => ({}));
  const record = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true, worker: true } });
  if (!record || (session.role !== "ADMIN" && record.customer.userId !== session.userId && record.worker?.userId !== session.userId)) return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  if (record.status !== "COMPLETED") return NextResponse.json({ error: "Proof is available after completion" }, { status: 409 });
  const proof = await prisma.completionProof.create({ data: { requestId: id, submittedBy: session.userId, note: String(body.note || "").slice(0, 500) || undefined, objectKey: body.objectKey ? String(body.objectKey).slice(0, 500) : undefined } });
  return NextResponse.json({ data: proof }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params; const record = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true } });
  if (!record || (session.role !== "ADMIN" && record.customer.userId !== session.userId)) return NextResponse.json({ error: "Customer access required" }, { status: 403 });
  if (record.status !== "COMPLETED") return NextResponse.json({ error: "Service is not completed" }, { status: 409 });
  const updated = await prisma.serviceRequest.update({ where: { id }, data: { completionApprovedAt: new Date() } });
  return NextResponse.json({ data: updated });
}
