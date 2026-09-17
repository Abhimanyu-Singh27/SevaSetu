import { PortalDashboard } from "@/components/PortalDashboard";
import { requireSession } from "@/lib/auth";

export default async function CustomerDashboard() {
  await requireSession(["CUSTOMER"]);
  return <PortalDashboard role="customer" />;
}
