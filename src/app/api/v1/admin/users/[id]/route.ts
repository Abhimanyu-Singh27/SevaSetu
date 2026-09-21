import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, role: { in: ["CUSTOMER", "WORKER"] } },
    select: {
      id: true,
      email: true,
      displayName: true,
      phone: true,
      role: true,
      status: true,
      preferredLanguage: true,
      createdAt: true,
      lastActiveAt: true,
      customerProfile: {
        select: {
          fullName: true,
          requests: {
            select: { id: true, status: true, locationLabel: true, createdAt: true, updatedAt: true, service: { select: { name: true } }, worker: { select: { fullName: true } } },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
        },
      },
      workerProfile: {
        select: {
          fullName: true,
          bio: true,
          experienceYears: true,
          availability: true,
          verificationStatus: true,
          serviceRadiusKm: true,
          latitude: true,
          longitude: true,
          completedJobs: true,
          ratingAverage: true,
          ratingCount: true,
          requests: {
            select: { id: true, status: true, locationLabel: true, createdAt: true, updatedAt: true, service: { select: { name: true } }, customer: { select: { fullName: true } } },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
        },
      },
      addresses: { select: { id: true, label: true, city: true, createdAt: true } },
      reviews: { select: { id: true, rating: true, createdAt: true, requestId: true }, orderBy: { createdAt: "desc" }, take: 100 },
      notifications: { select: { id: true, readAt: true, createdAt: true }, take: 100 },
      receivedReports: { select: { id: true, category: true, status: true, createdAt: true }, take: 100 },
      _count: { select: { sessions: true, conversationMemberships: true, auditEvents: true, savedWorkers: true, locationEvents: true, financialEntries: true, fraudSignals: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const requests = user.customerProfile?.requests || user.workerProfile?.requests || [];
  const counts = requests.reduce<Record<string, number>>((result, request) => ({ ...result, [request.status]: (result[request.status] || 0) + 1 }), {});
  return NextResponse.json({ data: { ...user, requests, counts, locationCount: new Set(requests.map((request) => request.locationLabel).filter(Boolean)).size } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findFirst({ where: { id, role: { in: ["CUSTOMER", "WORKER"] } }, select: { id: true, role: true, status: true } });
  if (!target) return NextResponse.json({ error: "Worker or customer not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.update({ where: { id }, data: { status: "DEACTIVATED" }, select: { id: true, status: true, role: true } });
    await transaction.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await transaction.auditLog.create({ data: { actorId: session.userId, action: "USER_DELETED", targetType: "USER", targetId: id, metadata: { role: target.role, previousStatus: target.status } } });
    return user;
  });

  return NextResponse.json({ data: updated });
}
