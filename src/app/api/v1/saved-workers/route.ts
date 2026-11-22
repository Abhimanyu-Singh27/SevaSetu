import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/portal-api";

const input = z.object({ workerId: z.string().uuid(), saved: z.boolean() });
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "CUSTOMER") return NextResponse.json({ error: "Customer access required" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid worker details." }, { status: 400 });
  try {
    const { workerId, saved } = parsed.data;
    if (saved) {
      const worker = await prisma.workerProfile.findFirst({ where: { id: workerId, user: { status: "ACTIVE" } }, select: { id: true } });
      if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
      await prisma.savedWorker.upsert({ where: { userId_workerId: { userId: session.userId, workerId } }, create: { userId: session.userId, workerId }, update: {} });
    } else await prisma.savedWorker.deleteMany({ where: { userId: session.userId, workerId } });
    return NextResponse.json({ data: { saved } });
  } catch (error) { return apiError(error); }
}
