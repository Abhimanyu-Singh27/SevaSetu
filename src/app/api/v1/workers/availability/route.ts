import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const availability = body.availability;
  if (!["AVAILABLE", "BUSY", "OFFLINE"].includes(availability)) return NextResponse.json({ error: "Invalid availability" }, { status: 400 });
  const worker = await prisma.workerProfile.update({ where: { userId: session.userId }, data: { availability }, select: { availability: true } });
  return NextResponse.json({ data: worker });
}
