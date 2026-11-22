"use client";

import { LocalizedText } from "@/components/LocalizedText";

import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const response = await fetch("/api/v1/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to send reset instructions"); return; }
    setMessage(result.data.message);
  }
  return <main className="state-page"><section className="state-panel"><span className="kicker"><LocalizedText>{"Account recovery"}</LocalizedText></span><h1><LocalizedText>{"Reset your password"}</LocalizedText></h1><p><LocalizedText>{"Enter your email and we will send a secure reset link."}</LocalizedText></p><form onSubmit={submit}><label><LocalizedText>{"Email address"}</LocalizedText><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="auth-error"><LocalizedText>{error}</LocalizedText></p>}{message && <p className="success-message"><LocalizedText>{message}</LocalizedText></p>}<button className="button" type="submit"><LocalizedText>{"Send reset link"}</LocalizedText></button></form><a href="/login"><LocalizedText>{"Back to sign in"}</LocalizedText></a></section></main>;
}
