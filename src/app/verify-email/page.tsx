"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MailCheck } from "lucide-react";
import { PublicLanguagePicker } from "@/components/PublicLanguagePicker";
import { portalText } from "@/lib/portal-i18n";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resending, setResending] = useState(false);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("sevasetu-language");
    if (saved === "hi") queueMicrotask(() => setLanguage(saved));
  }, []);

  function localizeMessage(value: string) {
    if (value.includes("invalid or expired")) return language === "hi" ? "सत्यापन कोड गलत या समाप्त हो गया है।" : "That verification code is invalid or expired.";
    if (value.includes("Too many")) return language === "hi" ? "बहुत अधिक प्रयास किए गए। बाद में दोबारा प्रयास करें।" : value;
    if (value.includes("verification code has been sent")) return language === "hi" ? "नया सत्यापन कोड भेज दिया गया है।" : value;
    return value;
  }

  useEffect(() => {
    if (verified || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, verified]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/v1/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
    const result = await response.json();
    if (!response.ok) { setMessage(localizeMessage(result.error || portalText(language, "unableVerify"))); return; }
    setVerified(true); setMessage(language === "hi" ? "ईमेल सत्यापित हो गया। अब आप लॉग इन कर सकते हैं।" : "Email verified. You can now sign in.");
  }

  async function resendCode() {
    setResending(true); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) { setMessage(localizeMessage(result.error || portalText(language, "unableResend"))); return; }
      setCode(""); setSecondsLeft(60); setMessage(localizeMessage(result.data.message));
    } catch {
      setMessage(portalText(language, "resendFailed"));
    } finally {
      setResending(false);
    }
  }

  return <main className="state-page"><div className="auth-language"><PublicLanguagePicker onLanguageChange={setLanguage} /></div><section className={`state-panel verification-panel${verified ? " verification-success" : ""}`}><div className="verification-header"><span className="verification-mark"><>{verified ? <CheckCircle2 size={28} /> : <MailCheck size={28} />}</></span><span className="kicker">{portalText(language, "accountVerification")}</span><h1>{verified ? portalText(language, "emailVerified") : portalText(language, "confirmEmail")}</h1><p>{verified ? portalText(language, "accountReady") : portalText(language, "enterCode")}</p></div>{!verified && <form className="verification-form" onSubmit={submit}><label>{portalText(language, "emailAddress")}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>{portalText(language, "verificationCode")}<input className="verification-code-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><div className="verification-timer" aria-live="polite">{secondsLeft > 0 ? portalText(language, "codeExpires", { seconds: String(secondsLeft).padStart(2, "0") }) : portalText(language, "codeExpired")}</div>{message && message !== portalText(language, "emailCodeSent") && <p className={`verification-message${message.includes("sent") || message.includes("भेज") ? " success" : " error"}`} role="status">{message}</p>}<div className="verification-actions"><button className="button" type="submit">{portalText(language, "verifyEmail")}</button><button className="outline-button verification-resend" type="button" disabled={secondsLeft > 0 || resending || !email} onClick={resendCode}>{resending ? portalText(language, "sending") : portalText(language, "resendCode")}</button><Link className="outline-button" href="/login">{portalText(language, "goToSignIn")}</Link></div></form>}{verified && <div className="verification-actions"><Link className="button" href="/login">{portalText(language, "goToSignIn")}</Link></div>}</section></main>;
}
