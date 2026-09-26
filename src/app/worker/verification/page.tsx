import Link from "next/link";
import { AccountSidebar } from "@/components/AccountSidebar";
import { PortalTopbar } from "@/components/PortalDashboard";
import { WorkerVerificationForm } from "@/components/WorkerVerificationForm";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePortalLanguage } from "@/lib/portal-i18n";

export default async function WorkerVerificationPage() {
  const session = await requireSession(["WORKER"]);
  const account = await prisma.user.findUnique({ where: { id: session.userId }, include: { workerProfile: true } });
  const name = account?.workerProfile?.fullName || "Worker account";
  const language = normalizePortalLanguage(account?.preferredLanguage);

  return <div className="portal-shell"><AccountSidebar role="worker" /><main className="portal-main"><PortalTopbar name={name} role="worker" language={language} /><div className="section-workspace"><Link className="back-link" href="/worker">Dashboard</Link><header className="workspace-heading"><div><span className="kicker">Worker workspace</span><h1>{language === "hi" ? "सत्यापन" : "Verification"}</h1><p>{language === "hi" ? "पहचान दस्तावेज़ जमा करें और समीक्षा स्थिति देखें。" : "Submit your identity document and track its review status."}</p></div></header><WorkerVerificationForm language={language} /></div></main></div>;
}