"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { SevaSetuLogo } from "@/components/SevaSetuLogo";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "CUSTOMER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return <main className="auth-page"><a className="brand auth-brand" href="/"><SevaSetuLogo /></a><section className="auth-card"><div className="auth-intro"><span className="kicker">Join the network</span><h1>Make everyday work easier.</h1><p>Create your SevaSetu account and verify your email to get started.</p></div><div className="role-switch" role="tablist" aria-label="Account type"><button className={form.role === "CUSTOMER" ? "active" : ""} onClick={() => setForm({ ...form, role: "CUSTOMER" })} type="button">I need a service</button><button className={form.role === "WORKER" ? "active" : ""} onClick={() => setForm({ ...form, role: "WORKER" })} type="button">I provide services</button></div><form onSubmit={submit}><label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label><label>Email address<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input type="password" required minLength={10} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>Create account <ArrowRight size={17} /></>}</button></form><p className="auth-foot">Already registered? <a href="/login">Sign in</a></p></section></main>;
}
