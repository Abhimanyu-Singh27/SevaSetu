"use client";

import { LocalizedDiv, LocalizedText } from "@/components/LocalizedText";

import { useLanguage } from "@/components/LanguageProvider";

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
  return <main className="auth-page"><div className="auth-language"><PublicLanguagePicker /></div><Link className="brand auth-brand" href="/"><SevaSetuLogo /></Link><section className="auth-card"><div className="auth-intro"><span className="kicker"><LocalizedText>{portalText(language, "joinNetwork")}</LocalizedText></span><h1><LocalizedText>{portalText(language, "makeWorkEasier")}</LocalizedText></h1><p><LocalizedText>{portalText(language, "createAccountDescription")}</LocalizedText></p></div><LocalizedDiv className="role-switch" role="tablist" aria-label={portalText(language, "accountType")}><button role="tab" aria-selected={form.role === "CUSTOMER"} className={form.role === "CUSTOMER" ? "active" : ""} onClick={() => setForm({ ...form, role: "CUSTOMER" })} type="button"><LocalizedText>{portalText(language, "needService")}</LocalizedText></button><button role="tab" aria-selected={form.role === "WORKER"} className={form.role === "WORKER" ? "active" : ""} onClick={() => setForm({ ...form, role: "WORKER" })} type="button"><LocalizedText>{portalText(language, "provideServices")}</LocalizedText></button></LocalizedDiv><form onSubmit={submit}><label><LocalizedText>{portalText(language, "fullName")}</LocalizedText><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label><label><LocalizedText>{portalText(language, "emailAddress")}</LocalizedText><input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><LocalizedText>{portalText(language, "password")}</LocalizedText><input type="password" required minLength={10} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="auth-error" role="alert"><LocalizedText>{error}</LocalizedText></p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <><LocalizedText>{portalText(language, "createAccount")}</LocalizedText> <ArrowRight size={17} /></>}</button></form><p className="auth-foot"><LocalizedText>{portalText(language, "alreadyRegistered")}</LocalizedText> <Link href="/login"><LocalizedText>{portalText(language, "signIn")}</LocalizedText></Link></p></section></main>;
}
