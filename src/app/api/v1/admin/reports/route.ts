import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Prisma, RequestStatus, UserRole, UserStatus, VerificationStatus } from "@prisma/client";

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "users";
  const page = Math.max(Number(url.searchParams.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 25), 1), 100);
  const search = url.searchParams.get("q")?.trim();
  const role = url.searchParams.get("role") as UserRole | null;
  const status = url.searchParams.get("status") as UserStatus | null;
  const verification = url.searchParams.get("verification") as VerificationStatus | null;
  const city = url.searchParams.get("city")?.trim();
  const requestStatus = url.searchParams.get("requestStatus") as RequestStatus | null;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const dateFilter = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined } : undefined;
  const wantsCsv = url.searchParams.get("format") === "csv";

  if (type === "requests") {
    const where: Prisma.ServiceRequestWhereInput = { status: requestStatus || undefined, createdAt: dateFilter, OR: search ? [{ description: { contains: search, mode: "insensitive" } }, { service: { name: { contains: search, mode: "insensitive" } } }] : undefined };
    const [total, rows, grouped] = await Promise.all([
      prisma.serviceRequest.count({ where }),
      prisma.serviceRequest.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, status: true, description: true, locationLabel: true, createdAt: true, customer: { select: { fullName: true } }, worker: { select: { fullName: true } }, service: { select: { name: true } } } }),
      prisma.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const data = rows.map((row) => ({ id: row.id, status: row.status, service: row.service.name, customer: row.customer.fullName, worker: row.worker?.fullName || "Unassigned", location: row.locationLabel || "Private", createdAt: row.createdAt.toISOString() }));
    if (wantsCsv) return new NextResponse(csv(data), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=sevasetu-requests.csv" } });
    return NextResponse.json({ data, counts: grouped.reduce<Record<string, number>>((result, item) => ({ ...result, [item.status]: item._count._all }), {}), meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }

  const where: Prisma.UserWhereInput = { role: role || { in: ["CUSTOMER", "WORKER"] }, status: status || undefined, createdAt: dateFilter, OR: search ? [{ email: { contains: search, mode: "insensitive" } }, { displayName: { contains: search, mode: "insensitive" } }, { customerProfile: { fullName: { contains: search, mode: "insensitive" } } }, { workerProfile: { fullName: { contains: search, mode: "insensitive" } } }] : undefined, workerProfile: verification ? { verificationStatus: verification } : undefined, addresses: city ? { some: { city: { contains: city, mode: "insensitive" } } } : undefined };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, email: true, displayName: true, role: true, status: true, createdAt: true, lastActiveAt: true, customerProfile: { select: { fullName: true } }, workerProfile: { select: { fullName: true, verificationStatus: true, completedJobs: true, availability: true } } } }),
  ]);
  const data = users.map((user) => ({ id: user.id, name: user.displayName || user.customerProfile?.fullName || user.workerProfile?.fullName || user.email, email: user.email, role: user.role, status: user.status, verification: user.workerProfile?.verificationStatus || "N/A", completedJobs: user.workerProfile?.completedJobs || 0, availability: user.workerProfile?.availability || "N/A", createdAt: user.createdAt.toISOString(), lastActiveAt: user.lastActiveAt?.toISOString() || "" }));
  if (wantsCsv) return new NextResponse(csv(data), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=sevasetu-users.csv" } });
  return NextResponse.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}
