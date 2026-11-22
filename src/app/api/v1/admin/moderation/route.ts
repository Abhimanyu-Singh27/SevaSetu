import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moderationInput } from "@/lib/portal-contracts";
import { apiError } from "@/lib/portal-api";
import type { FraudSignalStatus, ReportStatus } from "@prisma/client";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const parsed = moderationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid decision." }, { status: 400 });
  const { id, kind, status, note, expectedStatus } = parsed.data;
  const allowed = kind === "fraud" ? ["REVIEWED", "DISMISSED", "CONFIRMED"] : ["UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "REJECTED"];
  if (!allowed.includes(status)) return NextResponse.json({ error: "Choose a valid decision." }, { status: 400 });
  const priorStatuses = kind === "fraud" ? ["OPEN", "REVIEWED", "DISMISSED", "CONFIRMED"] : ["SUBMITTED", "UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "REJECTED"];
  if (!priorStatuses.includes(expectedStatus)) return NextResponse.json({ error: "Choose a valid decision." }, { status: 400 });
  if (["RESOLVED", "REJECTED", "CONFIRMED"].includes(status) && note.length < 5) return NextResponse.json({ error: "Add a reason for this decision." }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      let audience: string[] = [];
      if (kind === "report") {
        const changed = await tx.report.updateMany({ where: { id, status: expectedStatus as ReportStatus }, data: { status: status as ReportStatus } });
        if (changed.count !== 1) throw new Error("MODERATION_CONFLICT");
        const report = await tx.report.findUniqueOrThrow({ where: { id } });
        audience = [report.reporterId];
      } else if (kind === "dispute") {
        const closed = ["RESOLVED", "REJECTED"].includes(status);
        const changed = await tx.disputeCase.updateMany({ where: { id, status: expectedStatus as ReportStatus }, data: { status: status as ReportStatus, resolution: note || null, resolvedBy: closed ? session.userId : null, resolvedAt: closed ? new Date() : null } });
        if (changed.count !== 1) throw new Error("MODERATION_CONFLICT");
        const dispute = await tx.disputeCase.findUniqueOrThrow({ where: { id }, include: { request: { include: { customer: true, worker: true } } } });
        if (closed && dispute.request.status === "DISPUTED") {
          const previous = await tx.requestStatusHistory.findFirst({ where: { requestId: dispute.requestId, status: { not: "DISPUTED" } }, orderBy: { createdAt: "desc" }, select: { status: true } });
          if (previous) {
            await tx.serviceRequest.updateMany({ where: { id: dispute.requestId, status: "DISPUTED" }, data: { status: previous.status } });
            await tx.requestStatusHistory.create({ data: { requestId: dispute.requestId, status: previous.status, actorId: session.userId, note: "Service resumed after dispute review" } });
          }
        }
        audience = [dispute.request.customer.userId, ...(dispute.request.worker ? [dispute.request.worker.userId] : [])];
      } else {
        const changed = await tx.fraudSignal.updateMany({ where: { id, status: expectedStatus as FraudSignalStatus }, data: { status: status as FraudSignalStatus } });
        if (changed.count !== 1) throw new Error("MODERATION_CONFLICT");
      }
      await tx.auditLog.create({ data: { actorId: session.userId, action: "MODERATION_UPDATED", targetType: kind.toUpperCase(), targetId: id, metadata: { status, note } } });
      if (audience.length) await tx.notification.createMany({ data: audience.map((userId) => ({ userId, type: "REPORT_UPDATE" as const, title: "Support case updated", body: `Your support case is now ${status.toLowerCase().replaceAll("_", " ")}.`, data: { caseId: id, kind } })) });
    });
    return NextResponse.json({ data: { id, status } });
  } catch (error) {
    if (error instanceof Error && error.message === "MODERATION_CONFLICT") return NextResponse.json({ error: "This case changed. Refresh and try again." }, { status: 409 });
    return apiError(error);
  }
}
