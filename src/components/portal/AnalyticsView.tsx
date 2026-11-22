import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { requestScope } from "@/lib/portal-config";
import { LocalizedProgress, LocalizedText as T } from "@/components/LocalizedText";
import { EmptyState, Stats, Status } from "./Shared";

export async function AnalyticsView({ session }: { session: SessionUser }) {
  const scope = requestScope(session.role, session.userId);
  const since = new Date(); since.setDate(since.getDate() - 30);
  const [statuses, recent, services, money] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.serviceRequest.count({ where: { ...scope, createdAt: { gte: since } } }),
    prisma.serviceRequest.groupBy({ by: ["serviceId"], where: scope, _count: { _all: true }, orderBy: { _count: { serviceId: "desc" } }, take: 8 }),
    prisma.financialEntry.groupBy({ by: ["type"], where: { ...(session.role === "WORKER" ? { userId: session.userId } : {}), createdAt: { gte: since } }, _sum: { amount: true } }),
  ]);
  const catalog = await prisma.service.findMany({ where: { id: { in: services.map((row) => row.serviceId) } }, select: { id: true, name: true } });
  const total = statuses.reduce((sum, row) => sum + row._count._all, 0);
  const completed = statuses.find((row) => row.status === "COMPLETED")?._count._all || 0;
  const earnings = money.find((row) => row.type === "EARNING")?._sum.amount;
  return <><Stats items={[{ label: "All requests", value: total }, { label: "Requests in last 30 days", value: recent }, { label: "Completion rate", value: total ? `${Math.round(completed / total * 100)}%` : "—" }, { label: "Recorded earnings in last 30 days", value: `₹${Number(earnings || 0).toLocaleString("en-IN")}` }]} /><p className="portal-helper"><T>Completion rate uses all requests. Earnings are recorded service amounts, not bank settlements.</T></p>{total ? <div className="portal-two-column"><section className="portal-panel portal-padded"><h2><T>Requests by status</T></h2><div className="portal-data-bars">{statuses.map((row) => <div key={row.status}><span><Status value={row.status} /><strong>{row._count._all}</strong></span><LocalizedProgress value={row._count._all} max={total} aria-label={row.status} /></div>)}</div></section><section className="portal-panel portal-padded"><h2><T>Most requested services</T></h2><ol className="portal-ranking">{services.map((row) => <li key={row.serviceId}><T>{catalog.find((service) => service.id === row.serviceId)?.name || "Service"}</T><strong>{row._count._all}</strong></li>)}</ol></section></div> : <EmptyState title="No activity to analyse yet" description="Your charts will appear when real requests are created." />}</>;
}
