"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setMessage("This verification link is missing."); return; }
    fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage("Email verified. You can now sign in."); })
      .catch((error: Error) => setMessage(error.message));
  }, [params]);
  return <main className="state-page"><section className="state-panel"><h1>{message}</h1><a className="button" href="/login">Go to sign in</a></section></main>;
}
