import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/portal-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await params;
  const parsed = z.object({ workerId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: "Invalid worker details." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.serviceRequest.findFirst({ where: { id, workerId: null, status: { in: ["SUBMITTED", "SENT"] } }, include: { customer: true, service: true } });
      if (!record) throw new Error("ASSIGNMENT_CONFLICT");
      const worker = await tx.workerProfile.findFirst({ where: { id: parsed.data.workerId, availability: "AVAILABLE", user: { status: "ACTIVE" }, services: { some: { serviceId: record.serviceId, service: { active: true, category: { active: true } } } } } });
      if (!worker) throw new Error("WORKER_UNAVAILABLE");
      const changed = await tx.serviceRequest.updateMany({ where: { id, workerId: null, status: record.status }, data: { workerId: worker.id, status: "SENT" } });
      if (changed.count !== 1) throw new Error("ASSIGNMENT_CONFLICT");
      await tx.conversation.create({ data: { requestId: id, members: { create: [{ userId: record.customer.userId }, { userId: worker.userId }] } } });
      await tx.requestStatusHistory.create({ data: { requestId: id, status: "SENT", actorId: session.userId, note: "Administrator assigned a professional" } });
      await tx.notification.createMany({ data: [record.customer.userId, worker.userId].map((userId) => ({ userId, type: "REQUEST_UPDATE" as const, title: "Professional assigned", body: `A professional has been assigned to your ${record.service.name} request.`, data: { requestId: id } })) });
      await tx.auditLog.create({ data: { actorId: session.userId, action: "REQUEST_ASSIGNED", targetType: "SERVICE_REQUEST", targetId: id, metadata: { workerId: worker.id } } });
      return { id, workerId: worker.id };
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && ["ASSIGNMENT_CONFLICT", "WORKER_UNAVAILABLE"].includes(error.message)) return NextResponse.json({ error: "This request or worker changed. Refresh and try again." }, { status: 409 });
    return apiError(error);
  }
}
