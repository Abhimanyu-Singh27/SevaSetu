import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const record = await prisma.serviceRequest.findUnique({ where: { id }, select: { customer: { select: { userId: true } }, worker: { select: { userId: true } } } });
  if (!record) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const allowed = session.role === "ADMIN" || record.customer.userId === session.userId || record.worker?.userId === session.userId;
  if (!allowed) return NextResponse.json({ error: "You cannot delete this request" }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({ where: { requestId: id }, select: { id: true } });
    if (conversation) await tx.conversation.delete({ where: { id: conversation.id } });
    await tx.review.deleteMany({ where: { requestId: id } });
    await tx.report.deleteMany({ where: { requestId: id } });
    await tx.fileAsset.deleteMany({ where: { requestId: id } });
    await tx.serviceRequest.delete({ where: { id } });
  });
  return NextResponse.json({ success: true });
}
