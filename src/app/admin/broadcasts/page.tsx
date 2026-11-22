import { PortalSection } from "@/components/PortalSection";
import type { PortalQuery } from "@/lib/portal-config";

export default async function Page({ searchParams }: { searchParams: Promise<PortalQuery> }) {
  return <PortalSection role="ADMIN" section={["broadcasts"]} query={await searchParams} />;
}
