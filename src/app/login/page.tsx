"use client";

import { LocalizedDiv, LocalizedText } from "@/components/LocalizedText";

import { useLanguage } from "@/components/LanguageProvider";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";
import { PublicLanguagePicker } from "@/components/PublicLanguagePicker";
import { portalText } from "@/lib/portal-i18n";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "WORKER">("CUSTOMER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch("/api/v1/auth/me", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => {
        const role = result?.data?.role;
        if (role === "WORKER") window.location.replace("/worker");
        else if (role === "CUSTOMER") window.location.replace("/customer");
        else if (role === "ADMIN") window.location.replace("/admin");
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to sign in"); setLoading(false); return; }
    window.location.assign(role === "WORKER" && result.data.user.role === "WORKER" ? "/worker" : result.data.redirectUrl);
  }

  if (checkingSession) return <main className="auth-page"><section className="auth-card"><LoaderCircle className="spin" size={24} /></section></main>;
  return <main className="auth-page"><div className="auth-language"><PublicLanguagePicker /></div><Link className="brand auth-brand" href="/"><SevaSetuLogo /></Link><section className="auth-card"><div className="auth-intro"><span className="portal-icon"><ShieldCheck size={19} /></span><span className="kicker"><LocalizedText>{portalText(language, "welcomeBackAuth")}</LocalizedText></span><h1><LocalizedText>{portalText(language, "getThingsDone")}</LocalizedText></h1><p><LocalizedText>{portalText(language, "signInDescription")}</LocalizedText></p></div><LocalizedDiv className="role-switch" role="tablist" aria-label={portalText(language, "accountType")}><button role="tab" aria-selected={role === "CUSTOMER"} className={role === "CUSTOMER" ? "active" : ""} onClick={() => setRole("CUSTOMER")} type="button"><LocalizedText>{portalText(language, "needService")}</LocalizedText></button><button role="tab" aria-selected={role === "WORKER"} className={role === "WORKER" ? "active" : ""} onClick={() => setRole("WORKER")} type="button"><LocalizedText>{portalText(language, "provideServices")}</LocalizedText></button></LocalizedDiv><form onSubmit={submit}><label><LocalizedText>{portalText(language, "emailAddress")}</LocalizedText><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label><LocalizedText>{portalText(language, "password")}</LocalizedText><input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error" role="alert"><LocalizedText>{error}</LocalizedText></p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <><LocalizedText>{portalText(language, "signIn")}</LocalizedText> <ArrowRight size={17} /></>}</button></form><p className="auth-foot"><Link href="/forgot-password"><LocalizedText>{portalText(language, "forgotPassword")}</LocalizedText></Link></p><p className="auth-foot"><LocalizedText>{portalText(language, "newToSevaSetu")}</LocalizedText> <Link href="/register"><LocalizedText>{portalText(language, "createAccount")}</LocalizedText></Link></p></section></main>;
}
