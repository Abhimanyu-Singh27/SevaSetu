"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const response = await fetch("/api/v1/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token"), password }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to reset password"); return; }
    setMessage("Password updated. You can now sign in.");
  }
  return <main className="state-page"><section className="state-panel"><span className="kicker">Account recovery</span><h1>Choose a new password</h1><form onSubmit={submit}><label>New password<input type="password" minLength={10} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}{message && <p className="success-message">{message}</p>}<button className="button" type="submit">Update password</button></form><a href="/login">Back to sign in</a></section></main>;
}
