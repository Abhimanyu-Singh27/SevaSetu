import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageNumber, pageSize, queryString, type PortalQuery } from "@/lib/portal-config";
import { LocalizedDate, LocalizedText as T } from "@/components/LocalizedText";
import { MutationButton } from "./Actions";
import { EmptyState, Pagination } from "./Shared";

export async function NotificationsView({ userId, role, query = {} }: { userId: string; role: string; query?: PortalQuery }) {
  const unreadOnly = queryString(query, "filter") === "unread"; const page = pageNumber(query.page);
  const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
  const [total, unread, notifications] = await Promise.all([
    prisma.notification.count({ where }), prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return <><div className="portal-toolbar"><div className="portal-tabs"><Link href={`/${role}/notifications`} aria-current={!unreadOnly ? "page" : undefined}><T>All notifications</T></Link><Link href={`/${role}/notifications?filter=unread`} aria-current={unreadOnly ? "page" : undefined}><T>Unread</T> ({unread})</Link></div>{unread > 0 && <MutationButton endpoint="/api/v1/notifications" payload={{ read: true }}>Mark all as read</MutationButton>}</div>
    {notifications.length ? <div className="portal-record-list">{notifications.map((notice) => {
      const data = notice.data && typeof notice.data === "object" && !Array.isArray(notice.data) ? notice.data : {};
      const href = typeof data.conversationId === "string" ? `/${role}/messages?conversation=${encodeURIComponent(data.conversationId)}` : typeof data.requestId === "string" ? `/${role}/requests?request=${encodeURIComponent(data.requestId)}` : typeof data.kind === "string" ? `/${role}/${role === "admin" ? "reports" : "requests"}` : null;
      return <article className={`portal-notice${notice.readAt ? "" : " is-unread"}`} key={notice.id}><header><h2><T>{notice.title}</T></h2><span className="status-pill"><T>{notice.readAt ? "Read" : "Unread"}</T></span></header><p>{notice.type === "MESSAGE" ? notice.body : <T>{notice.body}</T>}</p><small><LocalizedDate value={notice.createdAt} time /></small><div className="portal-actions">{href && <Link className="text-button" href={href}><T>View details</T></Link>}<MutationButton endpoint="/api/v1/notifications" payload={{ id: notice.id, read: !notice.readAt }}>{notice.readAt ? "Mark as unread" : "Mark as read"}</MutationButton></div></article>;
    })}</div> : <EmptyState title="No notifications yet" description="Account, request, review, and message updates will appear here." />}
    <Pagination total={total} page={page} pageSize={pageSize} base={`/${role}/notifications`} query={query} />
  </>;
}
