import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildActiveHourEarnings } from "@/lib/worker-earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });

  const worker = await prisma.workerProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, availability: true },
  });
  if (!worker) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });

  const [sessions, entries] = await Promise.all([
    prisma.workerAvailabilitySession.findMany({ where: { workerId: worker.id }, orderBy: { startedAt: "asc" }, select: { startedAt: true, endedAt: true } }),
    prisma.financialEntry.findMany({ where: { userId: session.userId, type: "EARNING" }, orderBy: { createdAt: "asc" }, select: { amount: true, createdAt: true } }),
  ]);
  const data = buildActiveHourEarnings(sessions, entries.map((entry) => ({ amount: Number(entry.amount), createdAt: entry.createdAt })), worker.availability !== "OFFLINE");
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}