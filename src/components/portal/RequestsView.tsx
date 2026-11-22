import Link from "next/link";
import { RequestStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { requestScope, activeStatuses, pageNumber, pageSize, queryString, type PortalQuery } from "@/lib/portal-config";
import { translateText } from "@/lib/portal-i18n";
import { getPortalLanguage } from "@/lib/portal-language";
import { LocalizedDate, LocalizedInput, LocalizedText as T } from "@/components/LocalizedText";
import { DeleteRequestButton } from "@/components/DeleteRequestButton";
import { AssignWorkerForm } from "./AdminActions";
import { RequestActions, ReportForm, ReviewForm } from "./Actions";
import { EmptyState, Pagination, Stats, Status } from "./Shared";

export async function RequestsView({ session, section, query = {} }: { session: SessionUser; section: string; query?: PortalQuery }) {
  const scope = requestScope(session.role, session.userId);
  const language = await getPortalLanguage();
  const q = queryString(query, "q").trim();
  const status = queryString(query, "status");
  const requestedId = queryString(query, "request");
  const page = pageNumber(query.page);
  const fixedStatus = section === "history" || section === "completed" ? { in: [RequestStatus.COMPLETED] } : section === "active" ? { in: activeStatuses.filter((value) => value !== "SUBMITTED" && value !== "SENT") } : undefined;
  const where: Prisma.ServiceRequestWhereInput = { ...scope, ...(fixedStatus ? { status: fixedStatus } : Object.values(RequestStatus).includes(status as RequestStatus) ? { status: status as RequestStatus } : {}), ...(q ? { OR: [{ description: { contains: q, mode: "insensitive" } }, { service: { name: { contains: translateText("en", q), mode: "insensitive" } } }] } : {}), ...(/^[a-f\d-]{36}$/i.test(requestedId) ? { id: requestedId } : {}) };
  const [total, rows, groups] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, include: { service: true, customer: { select: { fullName: true, userId: true } }, worker: { select: { id: true, userId: true, fullName: true } }, history: { orderBy: { createdAt: "asc" } }, reviews: { select: { id: true, customerId: true, rating: true } }, conversation: { select: { id: true } }, financialEntries: { where: { type: "EARNING" }, select: { amount: true } }, dispute: { select: { status: true, resolution: true } }, reports: { where: { reporterId: session.userId }, select: { id: true, category: true, status: true } } } }),
    prisma.serviceRequest.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
  ]);
  const availableWorkers = session.role === "ADMIN" ? await prisma.workerProfile.findMany({ where: { availability: "AVAILABLE", user: { status: "ACTIVE" }, services: { some: { serviceId: { in: rows.filter((row) => !row.worker).map((row) => row.serviceId) } } } }, select: { id: true, fullName: true, services: { select: { serviceId: true } } } }) : [];
  const count = (statuses: readonly string[]) => groups.filter((group) => statuses.includes(group.status)).reduce((sum, group) => sum + group._count._all, 0);
  const role = session.role.toLowerCase();
  return <><Stats items={[{ label: "All requests", value: count(Object.values(RequestStatus)) }, { label: "Active requests", value: count(activeStatuses) }, { label: "Completed services", value: count(["COMPLETED"]) }, { label: "Cancelled requests", value: count(["CANCELLED"]) }]} />
    <form className="portal-filters" method="get"><label><span className="sr-only"><T>Search requests</T></span><LocalizedInput name="q" defaultValue={q} placeholder="Search service or request details" /></label>{!fixedStatus && <label><span className="sr-only"><T>Status</T></span><select name="status" defaultValue={status}><option value=""><T>All statuses</T></option>{Object.values(RequestStatus).map((value) => <option key={value} value={value}><T>{value}</T></option>)}</select></label>}<button className="button"><T>Filter</T></button><Link className="text-button" href={`/${role}/${section}`}><T>Clear filters</T></Link>{session.role === "CUSTOMER" && <Link className="outline-button" href="/customer/services"><T>Book a service</T></Link>}</form>
    {rows.length ? <div className="portal-record-list">{rows.map((request) => <article className="portal-record-card" key={request.id} id={`request-${request.id}`}><header><div><span className="kicker">#{request.id.slice(0, 8)}</span><h2><T>{request.service.name}</T></h2><p>{session.role !== "CUSTOMER" ? request.customer.fullName : request.worker?.fullName || <T>Waiting for assignment</T>}</p></div><Status value={request.status} /></header><p className="portal-record-description">{request.description}</p><dl className="portal-record-meta"><div><dt><T>Requested</T></dt><dd><LocalizedDate value={request.createdAt} time /></dd></div><div><dt><T>Preferred appointment</T></dt><dd>{request.preferredDate ? <><LocalizedDate value={request.preferredDate} time /> {request.preferredTime}</> : <T>To be confirmed</T>}</dd></div><div><dt><T>Service location</T></dt><dd>{request.locationLabel || <T>Not provided</T>}</dd></div><div><dt><T>Customer budget</T></dt><dd>{request.budget !== null ? `₹${Number(request.budget).toLocaleString(language === "hi" ? "hi-IN" : "en-IN")}` : <T>Not specified</T>}</dd></div>{request.financialEntries.length > 0 && <div><dt><T>Recorded service amount</T></dt><dd>₹{request.financialEntries.reduce((sum, entry) => sum + Number(entry.amount), 0).toLocaleString(language === "hi" ? "hi-IN" : "en-IN")}</dd></div>}</dl>
      <div className="portal-actions">{request.conversation && session.role !== "ADMIN" && <Link className="outline-button" href={`/${role}/messages?conversation=${request.conversation.id}`}><T>Open conversation</T></Link>}{request.worker && <Link className="text-button" href={`/professionals/${request.worker.id}`}><T>View worker profile</T></Link>}{["DRAFT", "CANCELLED"].includes(request.status) && <DeleteRequestButton requestId={request.id} />}</div>
      {session.role === "ADMIN" && !request.worker && ["SUBMITTED", "SENT"].includes(request.status) && <AssignWorkerForm requestId={request.id} workers={availableWorkers.filter((worker) => worker.services.some((service) => service.serviceId === request.serviceId)).map(({ id, fullName }) => ({ id, fullName }))} />}
      <RequestActions id={request.id} status={request.status} role={session.role} />
      {session.role === "CUSTOMER" && request.status === "COMPLETED" && request.worker && !request.reviews.some((review) => review.customerId === session.userId) && <ReviewForm requestId={request.id} />}
      {session.role !== "ADMIN" && (session.role === "CUSTOMER" ? request.worker?.userId : request.customer.userId) && <ReportForm requestId={request.id} reportedUserId={session.role === "CUSTOMER" ? request.worker!.userId : request.customer.userId} />}
      {request.reports.length > 0 && <div className="portal-case-note"><strong><T>Your support reports</T></strong>{request.reports.map((report) => <p key={report.id}><T>{report.category}</T> · <T>{report.status}</T></p>)}</div>}
      {request.dispute && <div className="portal-case-note"><strong><T>Dispute status</T>: <T>{request.dispute.status}</T></strong>{request.dispute.resolution && <p>{request.dispute.resolution}</p>}</div>}
      <details className="portal-disclosure"><summary><T>Request timeline</T></summary><ol className="portal-timeline">{request.history.map((event) => <li key={event.id}><span><T>{event.status}</T> · <LocalizedDate value={event.createdAt} time /></span>{event.note && <p><T>{event.note}</T></p>}</li>)}</ol></details>
    </article>)}</div> : <EmptyState title="No matching requests" description="Your service requests and their progress will appear here." href={session.role === "CUSTOMER" ? "/customer/services" : undefined} action="Find a service" />}
    <Pagination total={total} page={page} pageSize={pageSize} base={`/${role}/${section}`} query={query} />
  </>;
}
