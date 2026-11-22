import { LocalizedText } from "@/components/LocalizedText";
import Link from "next/link";

export default function PrivacyPage() {
  return <main className="state-page"><article className="state-panel"><span className="kicker"><LocalizedText>{"SevaSetu"}</LocalizedText></span><h1><LocalizedText>{"Privacy Policy"}</LocalizedText></h1><p><LocalizedText>{"SevaSetu uses account, service-request, and communication data to provide the marketplace. We do not sell personal data. You may request account deactivation and data handling information through support."}</LocalizedText></p><p><LocalizedText>{"Location details are shared only when needed for a service and with the relevant participants. Verification documents must be stored in private provider storage in production."}</LocalizedText></p><Link className="button" href="/"><LocalizedText>{"Return home"}</LocalizedText></Link></article></main>;
}
