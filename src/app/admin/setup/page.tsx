"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";

type Mode = "CREATE" | "LOGIN";

export default function AdminSetupPage() {
  const [mode, setMode] = useState<Mode>("CREATE");
  const [adminExists, setAdminExists] = useState(false);
  const [activeAdmin, setActiveAdmin] = useState(false);
  const [activeAdminName, setActiveAdminName] = useState("The current administrator");
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", bootstrapSecret: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/auth/admin-status", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      setAdminExists(Boolean(data.adminExists));
      if (data.adminExists) setMode("LOGIN");
      setActiveAdmin(Boolean(data.activeAdmin));
      setActiveAdminName(data.activeAdminName || "The current administrator");
      setStatusLoaded(true);
    }).catch(() => { setError("Unable to check administrator setup status."); setStatusLoaded(true); });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/auth/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, action: mode === "CREATE" ? "create" : "login" }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to process administrator access"); setLoading(false); return; }
      window.location.assign(result.data.redirectUrl);
    } catch {
      setError("Unable to reach administrator access. Check the server and try again.");
      setLoading(false);
    }
  }

  return <main className="auth-page"><Link className="brand auth-brand" href="/"><SevaSetuLogo /></Link><section className="auth-card"><div className="auth-intro"><span className="portal-icon"><ShieldCheck size={19} /></span><span className="kicker">Administrator access</span><h1>{activeAdmin ? "Administrator access is in use." : mode === "CREATE" ? "Create an administrator account." : "Welcome back, admin."}</h1><p>{activeAdmin ? `${activeAdminName} must sign out before another administrator access session can begin.` : mode === "CREATE" ? "Choose independent credentials for a new SevaSetu administrator." : "Sign in to manage the SevaSetu platform."}</p></div>{statusLoaded && !activeAdmin && <><div className="role-switch" role="tablist" aria-label="Administrator access mode">{!adminExists && <button className={mode === "CREATE" ? "active" : ""} onClick={() => { setMode("CREATE"); setError(""); }} type="button">Create account</button>}<button className={mode === "LOGIN" ? "active" : ""} onClick={() => { setMode("LOGIN"); setError(""); }} type="button">Sign in</button></div><form onSubmit={submit}>{mode === "CREATE" && !adminExists && <><label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label><label>Bootstrap secret<input type="password" required autoComplete="off" placeholder="local-admin-bootstrap" value={form.bootstrapSecret} onChange={(event) => setForm({ ...form, bootstrapSecret: event.target.value })} /></label></>}<label>Email address<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input type="password" required minLength={mode === "CREATE" ? 10 : undefined} autoComplete={mode === "CREATE" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>{mode === "CREATE" ? "Create administrator" : "Sign in"} <ArrowRight size={17} /></>}</button></form></>}{(error || activeAdmin) && <p className="auth-error" role="alert">{error || "Administrator access is unavailable until the current administrator signs out."}</p>}<p className="auth-foot"><Link href="/">Return to SevaSetu</Link></p></section></main>;
}
