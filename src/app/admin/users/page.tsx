import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserStatusButton } from "@/components/UserStatusButton";
import { UserDeleteButton } from "@/components/UserDeleteButton";
import type { Prisma, UserRole, UserStatus } from "@prisma/client";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSession(["ADMIN"]);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const role = params.role === "CUSTOMER" || params.role === "WORKER" ? params.role as UserRole : undefined;
  const status = params.status === "ACTIVE" || params.status === "BLOCKED" || params.status === "SUSPENDED" || params.status === "DEACTIVATED" ? params.status as UserStatus : undefined;
  const page = Math.max(Number(params.page || 1), 1);
  const limit = 25;
  const where: Prisma.UserWhereInput = { role: role || { in: ["CUSTOMER", "WORKER"] }, status: status || undefined, OR: q ? [{ email: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }, { customerProfile: { fullName: { contains: q, mode: "insensitive" } } }, { workerProfile: { fullName: { contains: q, mode: "insensitive" } } }] : undefined };
  const [total, users] = await Promise.all([prisma.user.count({ where }), prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, email: true, displayName: true, role: true, status: true, createdAt: true, customerProfile: { select: { fullName: true } }, workerProfile: { select: { fullName: true, verificationStatus: true } } } })]);
  const query = new URLSearchParams(); if (q) query.set("q", q); if (role) query.set("role", role); if (status) query.set("status", status);
  const exportHref = `/api/v1/admin/reports?type=users&format=csv&${query.toString()}`;
  return <main className="state-page"><section className="state-panel" style={{ maxWidth: 1100, textAlign: "left" }}><Link className="back-link" href="/admin">Dashboard</Link><div className="workspace-heading"><div><span className="kicker">Admin workspace</span><h1>Users</h1><p>Search and review customer and worker accounts.</p></div><a className="button" href={exportHref}>Export CSV</a></div><form className="admin-filters" method="get"><input name="q" defaultValue={q} placeholder="Search name or email" /><select name="role" defaultValue={role || ""}><option value="">All roles</option><option value="CUSTOMER">Customers</option><option value="WORKER">Workers</option></select><select name="status" defaultValue={status || ""}><option value="">All statuses</option><option value="BLOCKED">Blocked</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DEACTIVATED">Deleted</option></select><button className="button" type="submit">Filter</button></form><div className="workspace-table">{users.map((user) => <div className="workspace-row" key={user.id}><div><strong>{user.displayName || user.customerProfile?.fullName || user.workerProfile?.fullName || user.email}</strong><small>{user.email} · {user.role} · Joined {user.createdAt.toLocaleDateString("en-IN")}</small></div><span className="status-pill">{user.status === "DEACTIVATED" ? "DELETED" : user.status}</span>{user.workerProfile && <small>{user.workerProfile.verificationStatus}</small>}<Link className="outline-button" href={`/admin/users/${user.id}`}>View details</Link>{user.status !== "DEACTIVATED" && <><UserStatusButton userId={user.id} status={user.status} /><UserDeleteButton userId={user.id} /></>}</div>)}</div><div className="workspace-stats"><span>Page {page} of {Math.max(Math.ceil(total / limit), 1)}</span><span>{total} matching accounts</span>{page > 1 && <Link href={`/admin/users?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) }).toString()}`}>Previous</Link>}{page * limit < total && <Link href={`/admin/users?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) }).toString()}`}>Next</Link>}</div></section></main>;
}
