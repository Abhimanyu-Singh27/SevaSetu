import { PortalSection } from "@/components/PortalSection";

export default async function WorkerSection({ params }: { params: Promise<{ section: string[] }> }) {
  return <PortalSection role="WORKER" section={(await params).section} />;
}