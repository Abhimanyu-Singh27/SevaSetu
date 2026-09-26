import Link from "next/link";
import { AccountSidebar } from "@/components/AccountSidebar";
import { PortalTopbar } from "@/components/PortalDashboard";
import { WorkerRequestActions } from "@/components/WorkerRequestActions";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WorkerRequestsPage() {
  const session = await requireSession(["WORKER"]);
  const [account, requests] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { workerProfile: { select: { fullName: true } } } }),
    prisma.serviceRequest.findMany({
      where: { worker: { userId: session.userId }, status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED", "DISPUTED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true, description: true, createdAt: true, budget: true, service: { select: { name: true } }, customer: { select: { fullName: true } } },
    }),
  ]);
  const data = requests.map((request) => ({ ...request, createdAt: request.createdAt.toISOString(), budget: request.budget === null ? null : Number(request.budget) }));
  return <div className="portal-shell"><AccountSidebar role="worker" /><main className="portal-main"><PortalTopbar name={account?.workerProfile?.fullName || "Worker account"} role="worker" /><div className="section-workspace"><Link className="back-link" href="/worker">Dashboard</Link><header className="workspace-heading"><div><span className="kicker">Worker workspace</span><h1>Service requests</h1><p>Accept work, update its progress, and record the final amount when you complete it.</p></div></header><WorkerRequestActions initialRequests={data} /></div></main></div>;
}