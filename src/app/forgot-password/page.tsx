"use client";

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
  return <main className="state-page"><section className="state-panel"><span className="kicker">Account recovery</span><h1>Reset your password</h1><p>Enter your email and we will send a secure reset link.</p><form onSubmit={submit}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}{message && <p className="success-message">{message}</p>}<button className="button" type="submit">Send reset link</button></form><a href="/login">Back to sign in</a></section></main>;
}
