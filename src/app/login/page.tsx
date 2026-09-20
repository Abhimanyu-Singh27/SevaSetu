"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "WORKER">("CUSTOMER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to sign in"); setLoading(false); return; }
    window.location.assign(role === "WORKER" && result.data.user.role === "WORKER" ? "/worker" : result.data.redirectUrl);
  }

  return <main className="auth-page"><Link className="brand auth-brand" href="/"><SevaSetuLogo /></Link><section className="auth-card"><div className="auth-intro"><span className="portal-icon"><ShieldCheck size={19} /></span><span className="kicker">Welcome back</span><h1>Let&apos;s get things done.</h1><p>Sign in to manage your services, requests, and conversations.</p></div><div className="role-switch" role="tablist" aria-label="Account type"><button role="tab" aria-selected={role === "CUSTOMER"} className={role === "CUSTOMER" ? "active" : ""} onClick={() => setRole("CUSTOMER")} type="button">I need a service</button><button role="tab" aria-selected={role === "WORKER"} className={role === "WORKER" ? "active" : ""} onClick={() => setRole("WORKER")} type="button">I provide services</button></div><form onSubmit={submit}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>Sign in <ArrowRight size={17} /></>}</button></form><p className="auth-foot"><Link href="/forgot-password">Forgot password?</Link></p><p className="auth-foot">New to SevaSetu? <Link href="/register">Create an account</Link> · <Link href="/admin/setup">Administrator setup</Link></p></section></main>;
}
