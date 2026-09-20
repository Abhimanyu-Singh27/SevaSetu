"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Enter the six-digit code sent to your email.");
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (verified || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, verified]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/v1/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Unable to verify your email."); return; }
    setVerified(true); setMessage("Email verified. You can now sign in.");
  }

  async function resendCode() {
    setResending(true); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "Unable to resend the verification code."); return; }
      setCode(""); setSecondsLeft(60); setMessage(result.data.message);
    } catch {
      setMessage("Unable to resend the verification code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return <main className="state-page"><section className={`state-panel verification-panel${verified ? " verification-success" : ""}`}><div className="verification-header"><span className="verification-mark"><>{verified ? <CheckCircle2 size={28} /> : <MailCheck size={28} />}</></span><span className="kicker">Account verification</span><h1>{verified ? "Email verified" : "Confirm your email"}</h1><p>{verified ? "Your SevaSetu account is ready. Sign in to continue." : "Enter the six-digit code we sent to your email address."}</p></div>{!verified && <form className="verification-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Verification code<input className="verification-code-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><div className="verification-timer" aria-live="polite">{secondsLeft > 0 ? `Code expires in 00:${String(secondsLeft).padStart(2, "0")}` : "Code expired. Request a new code."}</div>{message && message !== "Enter the six-digit code sent to your email." && <p className={`verification-message${message.includes("sent") ? " success" : " error"}`} role="status">{message}</p>}<div className="verification-actions"><button className="button" type="submit">Verify email</button><button className="outline-button verification-resend" type="button" disabled={secondsLeft > 0 || resending || !email} onClick={resendCode}>{resending ? "Sending..." : "Resend code"}</button><Link className="outline-button" href="/login">Go to sign in</Link></div></form>}{verified && <div className="verification-actions"><Link className="button" href="/login">Go to sign in</Link></div>}</section></main>;
}
