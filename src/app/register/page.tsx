"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";
import { PublicLanguagePicker } from "@/components/PublicLanguagePicker";
import { portalText } from "@/lib/portal-i18n";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "CUSTOMER" });
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
    try {
      const response = await fetch("/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to create account"); setLoading(false); return; }
      window.location.assign(result.data.redirectUrl);
    } catch {
      setError("Unable to reach account creation. Check the server and try again.");
      setLoading(false);
    }
  }

  if (checkingSession) return <main className="auth-page"><section className="auth-card"><LoaderCircle className="spin" size={24} /></section></main>;
  return <main className="auth-page"><div className="auth-language"><PublicLanguagePicker onLanguageChange={setLanguage} /></div><Link className="brand auth-brand" href="/"><SevaSetuLogo /></Link><section className="auth-card"><div className="auth-intro"><span className="kicker">{portalText(language, "joinNetwork")}</span><h1>{portalText(language, "makeWorkEasier")}</h1><p>{portalText(language, "createAccountDescription")}</p></div><div className="role-switch" role="tablist" aria-label={portalText(language, "accountType")}><button role="tab" aria-selected={form.role === "CUSTOMER"} className={form.role === "CUSTOMER" ? "active" : ""} onClick={() => setForm({ ...form, role: "CUSTOMER" })} type="button">{portalText(language, "needService")}</button><button role="tab" aria-selected={form.role === "WORKER"} className={form.role === "WORKER" ? "active" : ""} onClick={() => setForm({ ...form, role: "WORKER" })} type="button">{portalText(language, "provideServices")}</button></div><form onSubmit={submit}><label>{portalText(language, "fullName")}<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label><label>{portalText(language, "emailAddress")}<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>{portalText(language, "password")}<input type="password" required minLength={10} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>{portalText(language, "createAccount")} <ArrowRight size={17} /></>}</button></form><p className="auth-foot">{portalText(language, "alreadyRegistered")} <Link href="/login">{portalText(language, "signIn")}</Link></p></section></main>;
}
