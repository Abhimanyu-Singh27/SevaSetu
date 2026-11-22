import { PortalSection } from "@/components/PortalSection";
import type { PortalQuery } from "@/lib/portal-config";

export default async function Page({ params, searchParams }: { params: Promise<{ section: string[] }>; searchParams: Promise<PortalQuery> }) {
  return <PortalSection role="ADMIN" section={(await params).section} query={await searchParams} />;
}
