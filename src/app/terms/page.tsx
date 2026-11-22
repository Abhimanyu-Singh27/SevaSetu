import { LocalizedText } from "@/components/LocalizedText";
import Link from "next/link";

export default function TermsPage() {
  return <main className="state-page"><article className="state-panel"><span className="kicker"><LocalizedText>{"SevaSetu"}</LocalizedText></span><h1><LocalizedText>{"Terms of Service"}</LocalizedText></h1><p><LocalizedText>{"Users must provide accurate information, protect their credentials, and use SevaSetu lawfully. Customers and workers are responsible for confirming service details before work begins."}</LocalizedText></p><p><LocalizedText>{"SevaSetu may suspend accounts, requests, or content for safety, fraud, abuse, or policy violations. The final commercial and legal terms must be reviewed and approved before public launch."}</LocalizedText></p><Link className="button" href="/"><LocalizedText>{"Return home"}</LocalizedText></Link></article></main>;
}
