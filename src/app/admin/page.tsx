import { PortalDashboard } from "@/components/PortalDashboard";
import { requireSession } from "@/lib/auth";

export default async function AdminDashboard() {
  await requireSession(["ADMIN"]);
  return <PortalDashboard role="admin" />;
}
