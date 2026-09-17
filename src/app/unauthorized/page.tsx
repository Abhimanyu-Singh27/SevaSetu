import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return <main className="auth-page"><section className="auth-card"><div className="auth-intro"><span className="portal-icon"><ShieldAlert size={19} /></span><span className="kicker">Access restricted</span><h1>You do not have access to this page.</h1><p>Sign in with the account type that owns this workspace.</p></div><div className="auth-foot"><Link className="button auth-submit" href="/">Return home</Link><Link className="button outline-button" href="/login">Sign in</Link></div></section></main>;
}
