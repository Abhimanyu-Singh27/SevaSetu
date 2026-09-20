import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminRequestsPage() {
  await requireSession(["ADMIN"]);
  const [counts, requests] = await Promise.all([prisma.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } }), prisma.serviceRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, status: true, description: true, locationLabel: true, createdAt: true, service: { select: { name: true } }, customer: { select: { fullName: true } }, worker: { select: { fullName: true } } } })]);
  return <AdminShell title="Request reporting" exportHref="/api/v1/admin/reports?type=requests&format=csv"><div className="workspace-stats">{["SUBMITTED", "ACCEPTED", "REJECTED", "CANCELLED", "DISPUTED", "COMPLETED"].map((status) => <div key={status}><strong>{counts.find((item) => item.status === status)?._count._all || 0}</strong><span>{status}</span></div>)}</div><div className="workspace-table">{requests.map((request) => <div className="workspace-row" key={request.id}><div><strong>{request.service.name}</strong><small>{request.customer.fullName} · {request.worker?.fullName || "Unassigned"} · {request.locationLabel || "Location private"} · {request.createdAt.toLocaleDateString("en-IN")}</small></div><span className="status-pill">{request.status}</span></div>)}</div></AdminShell>;
}

function AdminShell({ title, exportHref, children }: { title: string; exportHref?: string; children: React.ReactNode }) { return <main className="state-page"><section className="state-panel" style={{ maxWidth: 1100, textAlign: "left" }}><Link className="back-link" href="/admin">Dashboard</Link><div className="workspace-heading"><div><span className="kicker">Admin workspace</span><h1>{title}</h1></div>{exportHref && <a className="button" href={exportHref}>Export CSV</a>}</div>{children}</section></main>; }
