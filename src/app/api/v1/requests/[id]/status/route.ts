import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, type AppRole } from "@/lib/auth";
import { type RequestStatusAction } from "@/lib/realtime";
import { beginIdempotency, completeIdempotency } from "@/lib/idempotency";
import { recordRealtimeEvent } from "@/lib/realtime-events";

type OpenRequestStatus = "DRAFT" | "SUBMITTED" | "ACCEPTED" | "SCHEDULED" | "EN_ROUTE" | "IN_PROGRESS";
type RequestStatus = OpenRequestStatus | "REJECTED" | "COMPLETED" | "CANCELLED" | "DISPUTED";

const transitions: Record<RequestStatusAction, { next: RequestStatus; from: RequestStatus[]; roles: AppRole[] }> = {
  submit: { next: "SUBMITTED", from: ["DRAFT"], roles: ["CUSTOMER"] },
  accept: { next: "ACCEPTED", from: ["SUBMITTED"], roles: ["WORKER"] },
  reject: { next: "REJECTED", from: ["SUBMITTED"], roles: ["WORKER"] },
  schedule: { next: "SCHEDULED", from: ["ACCEPTED"], roles: ["WORKER"] },
  en_route: { next: "EN_ROUTE", from: ["SCHEDULED"], roles: ["WORKER"] },
  start: { next: "IN_PROGRESS", from: ["EN_ROUTE"], roles: ["WORKER"] },
  complete: { next: "COMPLETED", from: ["IN_PROGRESS"], roles: ["WORKER"] },
  cancel: { next: "CANCELLED", from: ["DRAFT", "SUBMITTED", "ACCEPTED", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS"], roles: ["CUSTOMER", "WORKER"] },
  dispute: { next: "DISPUTED", from: ["SUBMITTED", "ACCEPTED", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS"], roles: ["CUSTOMER", "WORKER"] },
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action as RequestStatusAction;
  const transition = transitions[action];
  if (!transition || !transition.roles.includes(session.role)) return NextResponse.json({ error: "Action is not allowed for this account" }, { status: 403 });
  const earningAmount = Number(body.earningAmount);
  if (action === "complete" && (!Number.isFinite(earningAmount) || earningAmount < 0 || earningAmount > 10_000_000)) {
    return NextResponse.json({ error: "Enter the final service amount from 0 to 10,000,000 INR." }, { status: 400 });
  }

  const existing = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true, worker: true, service: true } });
  if (!existing) return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  const isCustomer = existing.customer.userId === session.userId;
  const isWorker = existing.worker?.userId === session.userId;
  if (session.role !== "ADMIN" && !isCustomer && !isWorker) return NextResponse.json({ error: "You do not have access to this request" }, { status: 403 });
  if (session.role === "CUSTOMER" && action !== "cancel" && action !== "dispute") return NextResponse.json({ error: "Customers cannot perform that transition" }, { status: 403 });
  if (session.role === "WORKER" && !isWorker) return NextResponse.json({ error: "Only the assigned worker can perform that transition" }, { status: 403 });
  if (!transition.from.includes(existing.status as RequestStatus)) return NextResponse.json({ error: `Cannot ${action.replaceAll("_", " ")} a request in ${existing.status.toLowerCase().replaceAll("_", " ")} state.` }, { status: 409 });

  const idempotencyKey = request.headers.get("Idempotency-Key");
  const idempotency = idempotencyKey ? await beginIdempotency(session.userId, `POST:/api/v1/requests/${id}/status`, idempotencyKey) : {};
  if (idempotency.replay) return NextResponse.json(idempotency.replay.body, { status: idempotency.replay.status });

  const updated = await prisma.$transaction(async (tx) => {
    const data = { status: transition.next, ...(transition.next === "COMPLETED" ? { completedAt: new Date() } : {}) };
    const claimed = await tx.serviceRequest.updateMany({ where: { id, status: existing.status }, data });
    if (claimed.count !== 1) throw new Error("REQUEST_STATUS_CONFLICT");
    const result = await tx.serviceRequest.findUniqueOrThrow({ where: { id } });
    if (transition.next === "COMPLETED" && existing.worker) {
      const worker = await tx.workerProfile.findUnique({ where: { id: existing.worker.id }, select: { availability: true } });
      if (worker?.availability !== "OFFLINE") {
        await tx.financialEntry.create({ data: { userId: session.userId, requestId: id, type: "EARNING", amount: earningAmount, currency: "INR", reference: `Service ${existing.service.name}` } });
      }
    }
    await tx.requestStatusHistory.create({ data: { requestId: id, actorId: session.userId, status: transition.next, note: body.note ? String(body.note).slice(0, 500) : undefined } });
    if (transition.next === "DISPUTED") await tx.disputeCase.upsert({ where: { requestId: id }, create: { requestId: id, openedBy: session.userId }, update: { status: "SUBMITTED", resolution: null, resolvedBy: null, resolvedAt: null } });
    await tx.auditLog.create({ data: { actorId: session.userId, action: "REQUEST_STATUS_CHANGED", targetType: "SERVICE_REQUEST", targetId: id, metadata: { from: existing.status, to: transition.next } } });
    const audience = [existing.customer.userId, ...(existing.worker?.userId ? [existing.worker.userId] : [])].filter((userId) => userId !== session.userId);
    await tx.notification.createMany({ data: audience.map((userId) => ({ userId, type: "REQUEST_UPDATE" as const, title: "Service request updated", body: `${existing.service.name} is now ${transition.next.toLowerCase().replaceAll("_", " ")}.`, data: { requestId: id, status: transition.next } })) });
    await recordRealtimeEvent({ name: "request.status_changed", actorId: session.userId, audienceUserIds: audience, payload: { requestId: id, status: transition.next } }, tx);
    return result;
  });
  const responseBody = { data: updated };
  if (idempotency.recordId) await completeIdempotency(idempotency.recordId, { status: 200, body: responseBody });
  return NextResponse.json(responseBody);
}
