import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession, type AppRole } from "@/lib/auth";
import { AccountSidebar } from "@/components/AccountSidebar";
import { AccountMenu } from "@/components/AccountMenu";
import { PortalRefreshButton } from "@/components/PortalRefreshButton";
import { LocalizedText as T } from "@/components/LocalizedText";
import type { PortalRole } from "@/lib/portal-config";

export async function PortalFrame({ role, title, description, children, dashboard = false, action }: { role: AppRole; title: string; description: string; children: ReactNode; dashboard?: boolean; action?: ReactNode }) {
  const session = await requireSession([role]);
  const account = await prisma.user.findUnique({ where: { id: session.userId }, select: { displayName: true, email: true, workerProfile: { select: { fullName: true } }, customerProfile: { select: { fullName: true } }, _count: { select: { notifications: { where: { readAt: null } } } } } });
  const portalRole = role.toLowerCase() as PortalRole;
  const name = account?.displayName || account?.workerProfile?.fullName || account?.customerProfile?.fullName || session.email.split("@")[0];
  return <div className="portal-shell"><AccountSidebar role={portalRole} /><main className="portal-main"><header className="portal-topbar"><Link className="portal-topbar-home" href={`/${portalRole}`}><T>{role === "ADMIN" ? "Admin workspace" : role === "WORKER" ? "Worker workspace" : "Customer workspace"}</T></Link><div className="portal-top-actions"><Link href={`/${portalRole}/notifications`}><Bell size={18} aria-hidden="true" /><span className="sr-only"><T>Notifications</T></span>{Boolean(account?._count.notifications) && <span className="portal-unread-indicator" />}</Link><AccountMenu name={name} role={portalRole} /><PortalRefreshButton /></div></header><div className="section-workspace portal-workspace">{!dashboard && <Link className="back-link" href={`/${portalRole}`}><ArrowLeft size={15} /><T>Dashboard</T></Link>}<header className="workspace-heading"><div><span className="kicker"><T>{dashboard ? "Your overview" : "Workspace"}</T></span><h1><T>{title}</T></h1><p><T>{description}</T></p></div>{action}</header>{children}</div></main></div>;
}
