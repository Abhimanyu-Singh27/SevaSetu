import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const availability = body.availability;
  if (!["AVAILABLE", "BUSY", "OFFLINE"].includes(availability)) return NextResponse.json({ error: "Invalid availability" }, { status: 400 });
  const result = await prisma.$transaction(async (transaction) => {
    const current = await transaction.workerProfile.findUnique({ where: { userId: session.userId }, select: { id: true, availability: true } });
    if (!current) return null;
    if (current.availability === availability) return { availability: current.availability };
    const now = new Date();
    const updated = await transaction.workerProfile.update({ where: { id: current.id }, data: { availability }, select: { availability: true } });
    const wasActive = current.availability !== "OFFLINE";
    const isActive = availability !== "OFFLINE";
    if (wasActive && !isActive) {
      await transaction.workerAvailabilitySession.updateMany({ where: { workerId: current.id, endedAt: null }, data: { endedAt: now } });
    } else if (!wasActive && isActive) {
      await transaction.workerAvailabilitySession.create({ data: { workerId: current.id, startedAt: now } });
    }
    return updated;
  });
  if (!result) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
  return NextResponse.json({ data: result });
}
