import { RequestStatus, ReportStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/auth";

export type SidebarBadges = Record<string, number>;

const activeRequestStatuses = [
  RequestStatus.SUBMITTED,
  RequestStatus.SENT,
  RequestStatus.ACCEPTED,
  RequestStatus.SCHEDULED,
  RequestStatus.EN_ROUTE,
  RequestStatus.IN_PROGRESS,
];

export async function getSidebarBadges(role: AppRole, userId: string): Promise<SidebarBadges> {
  if (role === "ADMIN") {
    const [verification, reports] = await Promise.all([
      prisma.verification.count({ where: { status: VerificationStatus.PENDING } }),
      prisma.report.count({ where: { status: { in: [ReportStatus.SUBMITTED, ReportStatus.UNDER_REVIEW, ReportStatus.INVESTIGATING] } } }),
    ]);
    return { verification, reports };
  }

  if (role === "CUSTOMER") {
    const [requests, reviews, notifications, messages] = await Promise.all([
      prisma.serviceRequest.count({ where: { customer: { userId }, status: { in: activeRequestStatuses } } }),
      prisma.serviceRequest.count({ where: { customer: { userId }, status: RequestStatus.COMPLETED, reviews: { none: { customerId: userId } } } }),
      prisma.notification.count({ where: { userId, readAt: null } }),
      prisma.notification.count({ where: { userId, type: "MESSAGE", readAt: null } }),
    ]);
    return { requests, reviews, notifications, messages };
  }

  const [requests, services, reviews, verification, messages] = await Promise.all([
    prisma.serviceRequest.count({ where: { worker: { userId }, status: { in: [RequestStatus.SUBMITTED, RequestStatus.SENT] } } }),
    prisma.workerService.count({ where: { worker: { userId } } }),
    prisma.notification.count({ where: { userId, type: "REVIEW", readAt: null } }),
    prisma.verification.count({ where: { worker: { userId }, status: VerificationStatus.PENDING } }),
    prisma.notification.count({ where: { userId, type: "MESSAGE", readAt: null } }),
  ]);
  return { requests, services, reviews, verification, messages };
}
