import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { reportInput } from "@/lib/api-contracts";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = reportInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  if (input.reportedUserId === session.userId) return NextResponse.json({ error: "You cannot report your own account" }, { status: 400 });
  const target = await prisma.user.findFirst({ where: { id: input.reportedUserId, status: { not: "DEACTIVATED" } }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Reported account not found" }, { status: 404 });
  if (input.requestId) {
    const relatedRequest = await prisma.serviceRequest.findFirst({ where: { id: input.requestId, OR: [{ customer: { userId: session.userId } }, { worker: { userId: session.userId } }] }, select: { id: true } });
    if (!relatedRequest) return NextResponse.json({ error: "You do not have access to this service request" }, { status: 403 });
  }
  const report = await prisma.report.create({ data: { reporterId: session.userId, reportedUserId: input.reportedUserId, requestId: input.requestId, category: input.category, description: input.description } });
  return NextResponse.json({ data: report }, { status: 201 });
}
