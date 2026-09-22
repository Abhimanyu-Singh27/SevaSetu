import { PortalDashboard } from "@/components/PortalDashboard";
import { requireSession } from "@/lib/auth";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  await requireSession(["ADMIN"]);
  const params = await searchParams;
  return <PortalDashboard role="admin" panel={params.panel} />;
}
