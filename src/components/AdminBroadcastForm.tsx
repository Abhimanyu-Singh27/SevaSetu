"use client";

import { useState } from "react";

export function AdminBroadcastForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceRole, setAudienceRole] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/v1/admin/broadcasts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, audienceRole: audienceRole || undefined }) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Sent to ${result.recipients} accounts` : result.error || "Unable to send broadcast");
    if (response.ok) { setTitle(""); setBody(""); }
  }
  return <form className="admin-filters" onSubmit={submit}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Broadcast title" required /><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message" required /><select value={audienceRole} onChange={(event) => setAudienceRole(event.target.value)}><option value="">Customers and workers</option><option value="CUSTOMER">Customers</option><option value="WORKER">Workers</option></select><button className="button" type="submit">Send broadcast</button>{message && <span>{message}</span>}</form>;
}
