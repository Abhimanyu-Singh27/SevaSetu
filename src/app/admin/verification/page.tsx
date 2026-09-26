import Link from "next/link";
import { AccountSidebar } from "@/components/AccountSidebar";
import { AdminVerificationQueue } from "@/components/AdminVerificationQueue";
import { PortalTopbar } from "@/components/PortalDashboard";
import { requireSession } from "@/lib/auth";

export default async function AdminVerificationPage() {
  const session = await requireSession(["ADMIN"]);
  return <div className="portal-shell"><AccountSidebar role="admin" /><main className="portal-main"><PortalTopbar name={session.email.split("@")[0] || "Administrator"} role="admin" /><div className="section-workspace"><Link className="back-link" href="/admin">Dashboard</Link><header className="workspace-heading"><div><span className="kicker">Admin workspace</span><h1>Worker verification</h1><p>Review private government identity submissions before verifying worker profiles.</p></div></header><AdminVerificationQueue /></div></main></div>;
}