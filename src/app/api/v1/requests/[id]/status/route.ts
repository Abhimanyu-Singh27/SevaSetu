import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { availableRequestActions } from "@/lib/portal-config";
import { apiError } from "@/lib/portal-api";
import { beginIdempotency, completeIdempotency } from "@/lib/idempotency";
import { recordRealtimeEvent } from "@/lib/realtime-events";
import type { RequestStatus } from "@prisma/client";

const input = z.object({ action: z.enum(["submit", "accept", "reject", "schedule", "en_route", "start", "complete", "cancel", "dispute"]), note: z.string().trim().max(500).default(""), earningAmount: z.number().finite().min(0).max(10_000_000).optional(), scheduledFor: z.iso.datetime().optional() });
const nextStatus: Record<z.infer<typeof input>["action"], RequestStatus> = { submit: "SUBMITTED", accept: "ACCEPTED", reject: "REJECTED", schedule: "SCHEDULED", en_route: "EN_ROUTE", start: "IN_PROGRESS", complete: "COMPLETED", cancel: "CANCELLED", dispute: "DISPUTED" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: "Invalid request details" }, { status: 400 });
  const { action, note, earningAmount, scheduledFor } = parsed.data;
  if (["reject", "cancel", "dispute"].includes(action) && note.length < 5) return NextResponse.json({ error: "Add a reason for this decision." }, { status: 400 });
  if (action === "complete" && earningAmount === undefined) return NextResponse.json({ error: "Enter the final service amount before completing this job." }, { status: 400 });
  if (action === "schedule" && (!scheduledFor || new Date(scheduledFor).getTime() <= Date.now())) return NextResponse.json({ error: "Choose a future appointment time." }, { status: 400 });
  try {
    const existing = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true, worker: true, service: true } });
    if (!existing) return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    if (session.role === "ADMIN" || (session.role === "CUSTOMER" ? existing.customer.userId !== session.userId : existing.worker?.userId !== session.userId)) return NextResponse.json({ error: "You do not have access to this request" }, { status: 403 });
    const key = request.headers.get("Idempotency-Key");
    const idempotency = key ? await beginIdempotency(session.userId, `POST:/api/v1/requests/${id}/status`, key) : {};
    if (idempotency.replay) return NextResponse.json(idempotency.replay.body, { status: idempotency.replay.status });
    const allowed = availableRequestActions(session.role, existing.status);
    if (action === "submit" && session.role === "CUSTOMER" && existing.status === "DRAFT") allowed.push("submit");
    if (!allowed.includes(action)) return NextResponse.json({ error: "This request changed. Refresh and try again." }, { status: 409 });
    const status = nextStatus[action];
    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.serviceRequest.updateMany({ where: { id, status: existing.status }, data: { status, ...(action === "complete" ? { completedAt: new Date() } : {}), ...(action === "schedule" ? { preferredDate: new Date(scheduledFor!), preferredTime: null } : {}) } });
      if (claimed.count !== 1) throw new Error("REQUEST_STATUS_CONFLICT");
      if (action === "complete" && existing.worker) {
        await tx.financialEntry.create({ data: { userId: existing.worker.userId, requestId: id, type: "EARNING", amount: earningAmount!, currency: "INR", reference: `Service ${existing.service.name}` } });
        const completedJobs = await tx.serviceRequest.count({ where: { workerId: existing.worker.id, completedAt: { not: null } } });
        await tx.workerProfile.update({ where: { id: existing.worker.id }, data: { completedJobs } });
      }
      await tx.requestStatusHistory.create({ data: { requestId: id, actorId: session.userId, status, note: note || null } });
      if (action === "dispute") await tx.disputeCase.upsert({ where: { requestId: id }, create: { requestId: id, openedBy: session.userId }, update: { status: "SUBMITTED", resolution: null, resolvedBy: null, resolvedAt: null } });
      await tx.auditLog.create({ data: { actorId: session.userId, action: "REQUEST_STATUS_CHANGED", targetType: "SERVICE_REQUEST", targetId: id, metadata: { from: existing.status, to: status } } });
      const audience = [existing.customer.userId, ...(existing.worker ? [existing.worker.userId] : [])].filter((userId) => userId !== session.userId);
      if (audience.length) await tx.notification.createMany({ data: audience.map((userId) => ({ userId, type: "REQUEST_UPDATE" as const, title: "Service request updated", body: `${existing.service.name} is now ${status.toLowerCase().replaceAll("_", " ")}.`, data: { requestId: id, status } })) });
      await recordRealtimeEvent({ name: "request.status_changed", actorId: session.userId, audienceUserIds: audience, payload: { requestId: id, status } }, tx);
      return tx.serviceRequest.findUniqueOrThrow({ where: { id } });
    });
    const responseBody = { data: updated };
    if (idempotency.recordId) await completeIdempotency(idempotency.recordId, { status: 200, body: responseBody });
    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_STATUS_CONFLICT") return NextResponse.json({ error: "This request changed. Refresh and try again." }, { status: 409 });
    return apiError(error, "Unable to update request.");
  }
}
