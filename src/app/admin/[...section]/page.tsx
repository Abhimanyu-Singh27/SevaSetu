import { PortalSection } from "@/components/PortalSection";

export default async function AdminSection({ params }: { params: Promise<{ section: string[] }> }) {
  return <PortalSection role="ADMIN" section={(await params).section} />;
}