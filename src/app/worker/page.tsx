import { PortalDashboard } from "@/components/PortalDashboard";
import { requireSession } from "@/lib/auth";

export default async function WorkerDashboard() {
  await requireSession(["WORKER"]);
  return <PortalDashboard role="worker" />;
}
