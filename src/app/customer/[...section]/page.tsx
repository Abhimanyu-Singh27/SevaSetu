import { PortalSection } from "@/components/PortalSection";

export default async function CustomerSection({ params }: { params: Promise<{ section: string[] }> }) {
  return <PortalSection role="CUSTOMER" section={(await params).section} />;
}