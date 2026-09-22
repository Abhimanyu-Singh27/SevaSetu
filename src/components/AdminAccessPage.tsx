"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";
import { PublicLanguagePicker } from "@/components/PublicLanguagePicker";
import { portalText } from "@/lib/portal-i18n";

type Mode = "CREATE" | "LOGIN";

export function AdminAccessPage() {
  const [mode, setMode] = useState<Mode>("LOGIN");
  const [adminExists, setAdminExists] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", bootstrapSecret: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("sevasetu-language");
    if (saved === "hi") setLanguage(saved);
    fetch("/api/v1/auth/me", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((session) => {
        if (session?.data?.role === "ADMIN") {
          window.location.replace("/admin");
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
    fetch("/api/v1/auth/admin-status", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to check administrator setup status.");
        return data;
      })
      .then((data) => {
        const exists = Boolean(data.adminExists);
        setAdminExists(exists);
        if (!exists) setMode("CREATE");
        setStatusLoaded(true);
      })
      .catch((statusError: Error) => {
        setError(statusError.message || "Unable to check administrator setup status.");
        setStatusLoaded(true);
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, action: mode === "CREATE" ? "create" : "login" }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to process administrator access");
        setLoading(false);
        return;
      }
      window.location.assign(result.data.redirectUrl);
    } catch {
      setError("Unable to reach administrator access. Check the server and try again.");
      setLoading(false);
    }
  }

  if (checkingSession) return <main className="auth-page"><section className="auth-card"><LoaderCircle className="spin" size={24} /></section></main>;
  return <main className="auth-page"><div className="auth-language"><PublicLanguagePicker onLanguageChange={setLanguage} /></div><Link className="brand auth-brand" href="/"><SevaSetuLogo /></Link><section className="auth-card"><div className="auth-intro"><span className="portal-icon"><ShieldCheck size={19} /></span><span className="kicker">{portalText(language, "adminAccess")}</span><h1>{mode === "CREATE" ? portalText(language, "createAdmin") : portalText(language, "welcomeAdmin")}</h1><p>{mode === "CREATE" ? portalText(language, "chooseAdminCredentials") : portalText(language, "signInAdminDescription")}</p></div>{statusLoaded && <><div className="role-switch" role="tablist" aria-label={portalText(language, "accessMode")}>{!adminExists && <button className={mode === "CREATE" ? "active" : ""} onClick={() => { setMode("CREATE"); setError(""); }} type="button">{portalText(language, "createAccount")}</button>}<button className={mode === "LOGIN" ? "active" : ""} onClick={() => { setMode("LOGIN"); setError(""); }} type="button">{portalText(language, "signIn")}</button></div><form onSubmit={submit}>{mode === "CREATE" && !adminExists && <><label>{portalText(language, "fullName")}<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label><label>Bootstrap secret<input type="password" required autoComplete="off" placeholder="local-admin-bootstrap" value={form.bootstrapSecret} onChange={(event) => setForm({ ...form, bootstrapSecret: event.target.value })} /></label></>}<label>{portalText(language, "emailAddress")}<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>{portalText(language, "password")}<input type="password" required minLength={mode === "CREATE" ? 10 : undefined} autoComplete={mode === "CREATE" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>{mode === "CREATE" ? portalText(language, "createAdminButton") : portalText(language, "signIn")} <ArrowRight size={17} /></>}</button></form></>}{!statusLoaded && !error && <p>Checking administrator access...</p>}{error && !statusLoaded && <p className="auth-error" role="alert">{error}</p>}<p className="auth-foot"><Link href="/">{portalText(language, "returnSevaSetu")}</Link></p></section></main>;
}
