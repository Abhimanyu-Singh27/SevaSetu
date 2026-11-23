import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workerServiceBulkInput, workerServiceInput } from "@/lib/portal-contracts";
import { apiError } from "@/lib/portal-api";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });
  const parsed = workerServiceBulkInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select one or more valid services." }, { status: 400 });
  try {
    const [worker, services] = await Promise.all([
      prisma.workerProfile.findUnique({ where: { userId: session.userId }, select: { id: true } }),
      prisma.service.findMany({ where: { id: { in: parsed.data.serviceIds }, active: true, category: { active: true } }, select: { id: true } }),
    ]);
    if (!worker) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    if (services.length !== parsed.data.serviceIds.length) return NextResponse.json({ error: "One or more selected services are unavailable." }, { status: 400 });
    await prisma.$transaction(services.map((service) => prisma.workerService.upsert({
      where: { workerId_serviceId: { workerId: worker.id, serviceId: service.id } },
      create: { workerId: worker.id, serviceId: service.id, pricingType: "QUOTE_REQUIRED" },
      update: {},
    })));
    return NextResponse.json({ data: { added: services.length } });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });
  const parsed = workerServiceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid service and price." }, { status: 400 });
  try {
    const [worker, service] = await Promise.all([
      prisma.workerProfile.findUnique({ where: { userId: session.userId }, select: { id: true } }),
      prisma.service.findFirst({ where: { id: parsed.data.serviceId, active: true, category: { active: true } }, select: { id: true } }),
    ]);
    if (!worker || !service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    const data = { pricingType: parsed.data.pricingType, price: parsed.data.pricingType === "QUOTE_REQUIRED" ? null : parsed.data.price, description: parsed.data.description || null };
    const result = await prisma.workerService.upsert({ where: { workerId_serviceId: { workerId: worker.id, serviceId: service.id } }, create: { workerId: worker.id, serviceId: service.id, ...data }, update: data });
    return NextResponse.json({ data: result });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });
  const parsed = z.object({ serviceId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid worker details." }, { status: 400 });
  try {
    await prisma.workerService.deleteMany({ where: { worker: { userId: session.userId }, serviceId: parsed.data.serviceId } });
    return NextResponse.json({ data: { removed: true } });
  } catch (error) { return apiError(error); }
}
