"use client";

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
  const [language, setLanguage] = useState("en");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("sevasetu-language");
    if (saved === "hi") queueMicrotask(() => setLanguage(saved));
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
  return <main className="auth-page"><div className="auth-language"><PublicLanguagePicker onLanguageChange={setLanguage} /></div><Link className="brand auth-brand" href="/"><SevaSetuLogo /></Link><section className="auth-card"><div className="auth-intro"><span className="portal-icon"><ShieldCheck size={19} /></span><span className="kicker">{portalText(language, "welcomeBackAuth")}</span><h1>{portalText(language, "getThingsDone")}</h1><p>{portalText(language, "signInDescription")}</p></div><div className="role-switch" role="tablist" aria-label={portalText(language, "accountType")}><button role="tab" aria-selected={role === "CUSTOMER"} className={role === "CUSTOMER" ? "active" : ""} onClick={() => setRole("CUSTOMER")} type="button">{portalText(language, "needService")}</button><button role="tab" aria-selected={role === "WORKER"} className={role === "WORKER" ? "active" : ""} onClick={() => setRole("WORKER")} type="button">{portalText(language, "provideServices")}</button></div><form onSubmit={submit}><label>{portalText(language, "emailAddress")}<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>{portalText(language, "password")}<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>{portalText(language, "signIn")} <ArrowRight size={17} /></>}</button></form><p className="auth-foot"><Link href="/forgot-password">{portalText(language, "forgotPassword")}</Link></p><p className="auth-foot">{portalText(language, "newToSevaSetu")} <Link href="/register">{portalText(language, "createAccount")}</Link></p></section></main>;
}
