import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { reviewInput } from "@/lib/api-contracts";
import { apiError } from "@/lib/portal-api";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "CUSTOMER") return NextResponse.json({ error: "Only customers can submit reviews" }, { status: 403 });
  const parsed = reviewInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const requestRecord = await prisma.serviceRequest.findFirst({ where: { id: input.requestId, status: "COMPLETED", customer: { userId: session.userId }, workerId: { not: null } }, select: { id: true, workerId: true, worker: { select: { userId: true } } } });
  if (!requestRecord?.workerId) return NextResponse.json({ error: "Reviews are available after a completed service" }, { status: 409 });
  const workerId = requestRecord.workerId;
  try {
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({ data: { requestId: input.requestId, workerId, customerId: session.userId, rating: input.rating, quality: input.quality, behaviour: input.behaviour, punctuality: input.punctuality, communication: input.communication, value: input.value, body: input.body } });
      const [aggregate, ratingCount] = await Promise.all([
        tx.review.aggregate({ where: { workerId }, _avg: { rating: true } }),
        tx.review.count({ where: { workerId } }),
      ]);
      await tx.workerProfile.update({ where: { id: workerId }, data: { ratingAverage: aggregate._avg.rating ?? 0, ratingCount } });
      if (requestRecord.worker) await tx.notification.create({ data: { userId: requestRecord.worker.userId, type: "REVIEW", title: "New review received", body: `You received a new ${input.rating}-star review.`, data: { requestId: input.requestId } } });
      await tx.auditLog.create({ data: { actorId: session.userId, action: "REVIEW_CREATED", targetType: "REVIEW", targetId: created.id } });
      return created;
    });
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "A review has already been submitted for this service" }, { status: 409 });
    return apiError(error, "Unable to submit review. Please try again.");
  }
}
