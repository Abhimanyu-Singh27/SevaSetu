import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 120);
  const message = String(body.body || "").trim().slice(0, 1000);
  const audienceRole = body.audienceRole === "CUSTOMER" || body.audienceRole === "WORKER" ? body.audienceRole : undefined;
  if (!title || !message) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  const users = await prisma.user.findMany({ where: { status: "ACTIVE", role: audienceRole || { in: ["CUSTOMER", "WORKER"] } }, select: { id: true } });
  const broadcast = await prisma.$transaction(async (tx) => { const created = await tx.broadcast.create({ data: { createdBy: session.userId, title, body: message, audienceRole } }); await tx.notification.createMany({ data: users.map((user) => ({ userId: user.id, type: "SECURITY" as const, title, body: message, data: { broadcastId: created.id } })) }); await tx.auditLog.create({ data: { actorId: session.userId, action: "BROADCAST_SENT", targetType: "BROADCAST", targetId: created.id, metadata: { recipients: users.length, audienceRole } } }); return created; });
  return NextResponse.json({ data: broadcast, recipients: users.length }, { status: 201 });
}
