import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { pageNumber, pageSize, type PortalQuery } from "@/lib/portal-config";
import { LocalizedDate, LocalizedText as T } from "@/components/LocalizedText";
import { ReviewForm } from "./Actions";
import { EmptyState, Pagination, Stats } from "./Shared";

export async function ReviewsView({ session, query = {} }: { session: SessionUser; query?: PortalQuery }) {
  const where = session.role === "WORKER" ? { worker: { userId: session.userId } } : session.role === "CUSTOMER" ? { customerId: session.userId } : {};
  const page = pageNumber(query.page);
  const [reviews, aggregate, pending] = await Promise.all([
    prisma.review.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, include: { worker: { select: { fullName: true } }, customer: { select: { displayName: true, customerProfile: { select: { fullName: true } } } }, request: { select: { service: { select: { name: true } } } } } }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
    session.role === "CUSTOMER" ? prisma.serviceRequest.findMany({ where: { customer: { userId: session.userId }, status: "COMPLETED", workerId: { not: null }, reviews: { none: { customerId: session.userId } } }, orderBy: { completedAt: "desc" }, take: 50, select: { id: true, service: { select: { name: true } }, worker: { select: { fullName: true } } } }) : [],
  ]);
  return <><Stats items={[{ label: "Published reviews", value: aggregate._count._all }, { label: "Average rating", value: aggregate._avg.rating ? `${aggregate._avg.rating.toFixed(1)} / 5` : "—" }, ...(session.role === "CUSTOMER" ? [{ label: "Awaiting your review", value: pending.length }] : [])]} />
    {pending.length > 0 && <section className="portal-panel portal-padded"><h2><T>Share your experience</T></h2>{pending.map((request) => <div className="portal-review-pending" key={request.id}><strong><T>{request.service.name}</T> · {request.worker?.fullName}</strong><ReviewForm requestId={request.id} /></div>)}</section>}
    {reviews.length ? <div className="portal-record-list">{reviews.map((review) => <article className="portal-record-card" key={review.id}><header><div><h2><T>{review.request.service.name}</T></h2><p>{session.role === "WORKER" ? review.customer.customerProfile?.fullName || review.customer.displayName || <T>Customer</T> : review.worker.fullName}</p></div><strong className="portal-rating">{"★".repeat(review.rating)} <span>{review.rating}/5</span></strong></header>{review.body ? <p>{review.body}</p> : <p><T>Customer left a rating without written feedback.</T></p>}<small><LocalizedDate value={review.createdAt} /></small>{[review.quality && ["Quality", review.quality], review.behaviour && ["Behaviour", review.behaviour], review.punctuality && ["Punctuality", review.punctuality], review.communication && ["Communication", review.communication], review.value && ["Value", review.value]].some(Boolean) && <div className="portal-review-scores">{[["Quality", review.quality], ["Behaviour", review.behaviour], ["Punctuality", review.punctuality], ["Communication", review.communication], ["Value", review.value]].map(([label, score]) => score ? <span key={String(label)}><T>{String(label)}</T>: {score}/5</span> : null)}</div>}</article>)}</div> : <EmptyState title="No reviews yet" description="Ratings and feedback from completed services will appear here." />}
    <Pagination total={aggregate._count._all} page={page} pageSize={pageSize} base={`/${session.role.toLowerCase()}/reviews`} query={query} />
  </>;
}
