"use client";

import { LocalizedText } from "@/components/LocalizedText";

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
  return <main className="state-page"><section className="state-panel"><span className="kicker"><LocalizedText>{"Account recovery"}</LocalizedText></span><h1><LocalizedText>{"Choose a new password"}</LocalizedText></h1><form onSubmit={submit}><label><LocalizedText>{"New password"}</LocalizedText><input type="password" minLength={10} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error"><LocalizedText>{error}</LocalizedText></p>}{message && <p className="success-message"><LocalizedText>{message}</LocalizedText></p>}<button className="button" type="submit"><LocalizedText>{"Update password"}</LocalizedText></button></form><a href="/login"><LocalizedText>{"Back to sign in"}</LocalizedText></a></section></main>;
}
