"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { LocalizedText as T } from "./LocalizedText";
import { Feedback, SubmitButton, usePortalMutation } from "./portal/Actions";

export function AdminBroadcastForm() {
  const mutation = usePortalMutation(); const { t } = useLanguage();
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [audienceRole, setAudienceRole] = useState(""); const [recipients, setRecipients] = useState<number | null>(null);
  return <form className="portal-form-card portal-broadcast-form" onSubmit={async (event) => { event.preventDefault(); if (!window.confirm(t("Send this notification to all active accounts in the selected audience?"))) return; const result = await mutation.run("/api/v1/admin/broadcasts", { title, body, audienceRole: audienceRole || undefined }, "POST", "Broadcast sent."); if (result) { setRecipients(result.recipients); setTitle(""); setBody(""); } }}><h2><T>Send an account notification</T></h2><label><T>Audience</T><select value={audienceRole} onChange={(event) => setAudienceRole(event.target.value)}><option value=""><T>Customers and workers</T></option><option value="CUSTOMER"><T>Customers</T></option><option value="WORKER"><T>Workers</T></option></select></label><label><T>Title</T><input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label><T>Message</T><textarea required maxLength={1000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} /></label><SubmitButton busy={mutation.busy}>Send broadcast</SubmitButton><Feedback {...mutation} />{recipients !== null && <p role="status">{recipients} <T>accounts notified</T></p>}</form>;
}
