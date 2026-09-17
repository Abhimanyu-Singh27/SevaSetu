import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "BLOCKED" ? "BLOCKED" : body.status === "ACTIVE" ? "ACTIVE" : null;
  if (!status) return NextResponse.json({ error: "Status must be ACTIVE or BLOCKED" }, { status: 400 });

  const target = await prisma.user.findFirst({ where: { id, role: { in: ["CUSTOMER", "WORKER"] } }, select: { id: true, role: true, status: true } });
  if (!target) return NextResponse.json({ error: "Worker or customer not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.update({ where: { id }, data: { status }, select: { id: true, status: true, role: true } });
    if (status === "BLOCKED") await transaction.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await transaction.auditLog.create({ data: { actorId: session.userId, action: status === "BLOCKED" ? "USER_BLOCKED" : "USER_UNBLOCKED", targetType: "USER", targetId: id, metadata: { role: target.role } } });
    return user;
  });

  return NextResponse.json({ data: updated });
}