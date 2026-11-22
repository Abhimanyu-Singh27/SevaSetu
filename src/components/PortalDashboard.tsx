import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession, type AppRole } from "@/lib/auth";
import { requestScope, activeStatuses, type PortalRole } from "@/lib/portal-config";
import { LocalizedDate, LocalizedText as T } from "./LocalizedText";
import { AvailabilityToggle } from "./AvailabilityToggle";
import { AccountMenu } from "./AccountMenu";
import { PortalRefreshButton } from "./PortalRefreshButton";
import { PortalFrame } from "./portal/PortalFrame";
import { EmptyState, Stats, Status } from "./portal/Shared";
import { AnalyticsView } from "./portal/AnalyticsView";
import { PortalSection } from "./PortalSection";

export async function PortalDashboard({ role, panel }: { role: PortalRole; panel?: string }) {
  if (role === "admin" && panel === "requests") return PortalSection({ role: "ADMIN", section: ["requests"] });
  const session = await requireSession([role.toUpperCase() as AppRole]);
  const scope = requestScope(session.role, session.userId);
  const [account, statuses, unread, requests, notices, upcoming] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { displayName: true, email: true, customerProfile: { select: { fullName: true } }, workerProfile: { select: { fullName: true, availability: true, verificationStatus: true, _count: { select: { services: true } } } }, _count: { select: { savedWorkers: true } } } }),
    prisma.serviceRequest.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.notification.count({ where: { userId: session.userId, readAt: null } }),
    prisma.serviceRequest.findMany({ where: scope, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, description: true, status: true, updatedAt: true, service: { select: { name: true } }, worker: { select: { fullName: true } }, customer: { select: { fullName: true } } } }),
    prisma.notification.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, title: true, body: true, createdAt: true, type: true } }),
    role === "admin" ? [] : prisma.serviceRequest.findMany({ where: { ...scope, status: { in: ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS"] }, preferredDate: { gte: new Date() } }, orderBy: { preferredDate: "asc" }, take: 4, select: { id: true, preferredDate: true, service: { select: { name: true } } } }),
  ]);
  const count = (values: readonly string[]) => statuses.filter((group) => values.includes(group.status)).reduce((sum, group) => sum + group._count._all, 0);
  const active = count(activeStatuses), completed = count(["COMPLETED"]);
  const name = account.displayName || account.workerProfile?.fullName || account.customerProfile?.fullName || account.email.split("@")[0];
  const admin = role === "admin" ? await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }), prisma.user.count({ where: { role: "WORKER", status: "ACTIVE" } }),
    prisma.verification.count({ where: { status: "PENDING" } }), prisma.report.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "INVESTIGATING"] } } }),
    prisma.serviceRequest.count({ where: { workerId: null, status: { in: ["SUBMITTED", "SENT"] } } }),
  ]) : null;
  const earnings = role === "worker" ? await prisma.financialEntry.aggregate({ where: { userId: session.userId, type: "EARNING" }, _sum: { amount: true } }) : null;
  const analytics = role === "admin" ? await AnalyticsView({ session }) : null;
  return <PortalFrame role={session.role} title={role === "admin" ? "Admin dashboard" : "Dashboard"} description={role === "admin" ? "A live overview of your marketplace and the work that needs attention." : "Your current requests, appointments, and account activity."} dashboard action={role === "customer" ? <Link className="button" href="/customer/services"><T>Book a service</T></Link> : <Link className="outline-button" href={`/${role}/${role === "worker" ? "requests" : "verification"}`}><T>{role === "worker" ? "View requests" : "Review verifications"}</T></Link>}>
    <p className="portal-welcome"><T>Welcome back</T>, {name}.</p>
    {role === "worker" && account.workerProfile && <AvailabilityToggle initial={account.workerProfile.availability} />}
    <Stats items={admin ? [{ label: "Active customers", value: admin[0], href: "/admin/users?role=CUSTOMER" }, { label: "Active workers", value: admin[1], href: "/admin/users?role=WORKER" }, { label: "Awaiting verification", value: admin[2], href: "/admin/verification" }, { label: "Open reports", value: admin[3], href: "/admin/reports" }] : [{ label: "Active requests", value: active, href: `/${role}/${role === "worker" ? "active" : "requests"}` }, { label: "Completed services", value: completed, href: `/${role}/${role === "worker" ? "completed" : "history"}` }, { label: role === "worker" ? "Recorded earnings" : "Saved workers", value: role === "worker" ? `₹${Number(earnings?._sum.amount || 0).toLocaleString("en-IN")}` : account._count.savedWorkers, href: `/${role}/${role === "worker" ? "analytics" : "saved"}` }, { label: "Unread notifications", value: unread, href: `/${role}/notifications` }]} />
    {admin && admin[4] > 0 && <Link className="portal-attention-banner" href="/admin/requests?status=SUBMITTED"><strong>{admin[4]}</strong><T>requests need a professional assigned</T> →</Link>}
    {role === "worker" && account.workerProfile?.verificationStatus !== "VERIFIED" && <Link className="portal-attention-banner" href="/worker/verification"><T>Complete identity verification to build customer trust.</T> →</Link>}
    {role === "worker" && !account.workerProfile?._count.services && <Link className="portal-attention-banner" href="/worker/services"><T>Add your services and pricing to receive matching work.</T> →</Link>}
    <div className="portal-two-column"><section className="portal-panel portal-padded"><header className="portal-panel-heading"><h2><T>Recent requests</T></h2><Link href={`/${role}/requests`}><T>View all</T></Link></header>{requests.length ? <div className="portal-dashboard-list">{requests.map((request) => <Link key={request.id} href={`/${role}/requests?request=${request.id}`}><div><strong><T>{request.service.name}</T></strong><small>{role === "customer" ? request.worker?.fullName || <T>Waiting for assignment</T> : request.customer.fullName} · <LocalizedDate value={request.updatedAt} /></small></div><Status value={request.status} /></Link>)}</div> : <EmptyState title="No service requests yet" description="Your latest requests will appear here when activity begins." href={role === "customer" ? "/customer/services" : undefined} action="Find a service" />}</section><section className="portal-panel portal-padded"><header className="portal-panel-heading"><h2><T>{role === "admin" ? "Recent notifications" : "Upcoming appointments"}</T></h2><Link href={`/${role}/${role === "admin" ? "notifications" : role === "customer" ? "requests" : "active"}`}><T>View all</T></Link></header>{role !== "admin" ? upcoming.length ? <div className="portal-dashboard-list">{upcoming.map((request) => <Link key={request.id} href={`/${role}/requests?request=${request.id}`}><strong><T>{request.service.name}</T></strong><small><LocalizedDate value={request.preferredDate!} time /></small></Link>)}</div> : <EmptyState title="No upcoming appointments" description="Confirmed appointments with a future date will appear here." /> : <NoticeList notices={notices} role={role} />}</section></div>
    {role === "admin" ? analytics : <section className="portal-panel portal-padded"><header className="portal-panel-heading"><h2><T>Recent notifications</T></h2><Link href={`/${role}/notifications`}><T>View all</T></Link></header><NoticeList notices={notices} role={role} /></section>}
  </PortalFrame>;
}

function NoticeList({ notices, role }: { notices: { id: string; title: string; body: string; type: string; createdAt: Date }[]; role: string }) {
  return notices.length ? <div className="portal-dashboard-list">{notices.map((notice) => <Link href={`/${role}/notifications`} key={notice.id}><div><strong><T>{notice.title}</T></strong><small>{notice.type === "MESSAGE" ? notice.body : <T>{notice.body}</T>}</small></div><small><LocalizedDate value={notice.createdAt} /></small></Link>)}</div> : <EmptyState title="No notifications yet" description="New account and service updates will appear here." />;
}

// Kept for existing integrations that render the compact account header.
export function PortalTopbar({ name, role }: { name: string; role: PortalRole; language?: string }) {
  return <header className="portal-topbar"><Link href={`/${role}`}><T>Dashboard</T></Link><div className="portal-top-actions"><AccountMenu name={name} role={role} /><PortalRefreshButton /></div></header>;
}
