import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serviceRequestInput } from "@/lib/api-contracts";
import { beginIdempotency, completeIdempotency } from "@/lib/idempotency";
import { recordRealtimeEvent } from "@/lib/realtime-events";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);
  const cursor = url.searchParams.get("cursor") || undefined;
  const scope = session.role === "CUSTOMER" ? { customer: { userId: session.userId } } : session.role === "WORKER" ? { worker: { userId: session.userId } } : {};
  const cursorArgs: Pick<Prisma.ServiceRequestFindManyArgs, "cursor" | "skip"> = cursor ? { cursor: { id: cursor }, skip: 1 } : {};
  const query: Prisma.ServiceRequestFindManyArgs = {
    where: scope,
    select: { id: true, status: true, description: true, preferredDate: true, preferredTime: true, budget: true, locationLabel: true, createdAt: true, updatedAt: true, service: { select: { id: true, name: true, slug: true } }, customer: { select: { userId: true, fullName: true } }, worker: { select: { id: true, userId: true, fullName: true } } }, history: { orderBy: { createdAt: "asc" as const }, select: { status: true, note: true, createdAt: true } } },
    orderBy: { createdAt: "desc" as const },
    take: limit + 1,
    ...cursorArgs,
  };
  if (session.role === "ADMIN") {
    const requests = await prisma.serviceRequest.findMany(query);
    const hasMore = requests.length > limit;
    if (hasMore) requests.pop();
    return NextResponse.json({ data: requests, meta: { limit, nextCursor: hasMore ? requests.at(-1)?.id ?? null : null } });
  }
  const requests = await prisma.serviceRequest.findMany(query);
  const hasMore = requests.length > limit;
  if (hasMore) requests.pop();
  return NextResponse.json({ data: requests, meta: { limit, nextCursor: hasMore ? requests.at(-1)?.id ?? null : null } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "CUSTOMER") return NextResponse.json({ error: "Only customers can create service requests" }, { status: 403 });
  const parsed = serviceRequestInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request details", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: "Customer profile is incomplete" }, { status: 409 });
  const service = await prisma.service.findFirst({ where: { id: input.serviceId, active: true }, select: { id: true } });
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  if (input.workerId) {
    const worker = await prisma.workerProfile.findFirst({ where: { id: input.workerId, user: { status: "ACTIVE" } }, select: { id: true } });
    if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  const idempotency = idempotencyKey ? await beginIdempotency(session.userId, "POST:/api/v1/requests", idempotencyKey) : {};
  if (idempotency.replay) return NextResponse.json(idempotency.replay.body, { status: idempotency.replay.status });

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.serviceRequest.create({
      data: {
        customerId: customer.id,
        workerId: input.workerId,
        serviceId: input.serviceId,
        description: input.description,
        preferredDate: input.preferredDate,
        preferredTime: input.preferredTime,
        budget: input.budget,
        locationLabel: input.locationLabel,
        latitude: input.latitude,
        longitude: input.longitude,
        locationConsent: input.locationConsent,
        status: "SUBMITTED",
      },
      include: { service: true, worker: true },
    });
    await tx.requestStatusHistory.create({ data: { requestId: created.id, actorId: session.userId, status: "SUBMITTED", note: "Customer submitted a service request" } });
    await tx.auditLog.create({ data: { actorId: session.userId, action: "REQUEST_CREATED", targetType: "SERVICE_REQUEST", targetId: created.id, metadata: { serviceId: created.serviceId } } });
    if (created.worker?.userId) {
      await tx.conversation.create({ data: { requestId: created.id, members: { create: [{ userId: session.userId }, { userId: created.worker.userId }] } } });
      await tx.notification.create({ data: { userId: created.worker.userId, type: "REQUEST_UPDATE", title: "New service request", body: `A customer requested ${created.service.name}.`, data: { requestId: created.id } } });
      await recordRealtimeEvent({ name: "request.created", actorId: session.userId, audienceUserIds: [created.worker.userId], payload: { requestId: created.id, serviceId: created.serviceId } }, tx);
    }
    return created;
  });
  const responseBody = { data: result };
  if (idempotency.recordId) await completeIdempotency(idempotency.recordId, { status: 201, body: responseBody });
  return NextResponse.json(responseBody, { status: 201 });
}
