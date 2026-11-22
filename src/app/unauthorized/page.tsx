import { LocalizedText } from "@/components/LocalizedText";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return <main className="auth-page"><section className="auth-card"><div className="auth-intro"><span className="portal-icon"><ShieldAlert size={19} /></span><span className="kicker"><LocalizedText>{"Access restricted"}</LocalizedText></span><h1><LocalizedText>{"You do not have access to this page."}</LocalizedText></h1><p><LocalizedText>{"Sign in with the account type that owns this workspace."}</LocalizedText></p></div><div className="auth-foot"><Link className="button auth-submit" href="/"><LocalizedText>{"Return home"}</LocalizedText></Link><Link className="button outline-button" href="/login"><LocalizedText>{"Sign in"}</LocalizedText></Link></div></section></main>;
}
