"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Bookmark, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { LocalizedText as T } from "@/components/LocalizedText";
import { availableRequestActions } from "@/lib/portal-config";
import type { AppRole } from "@/lib/auth";

export function usePortalMutation() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function run(endpoint: string, body: unknown, method = "POST", message = "Changes saved.") {
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to save changes. Please try again.");
      setSuccess(message);
      window.dispatchEvent(new Event("sevasetu:refresh"));
      router.refresh();
      return result;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save changes. Please try again."); return null; }
    finally { setBusy(false); }
  }
  return { busy, error, success, run };
}

export function Feedback({ error, success }: { error?: string; success?: string }) {
  return <>{error && <p className="portal-feedback is-error" role="alert"><T>{error}</T></p>}{success && <p className="portal-feedback is-success" role="status"><Check size={15} /><T>{success}</T></p>}</>;
}
export function SubmitButton({ busy, children, className = "button", disabled = false }: { busy: boolean; children: ReactNode; className?: string; disabled?: boolean }) {
  return <button type="submit" className={className} disabled={busy || disabled}>{busy && <LoaderCircle size={15} className="spin" />}<T>{busy ? "Saving..." : children}</T></button>;
}
export function MutationButton({ endpoint, payload, method = "PATCH", children, confirm, successMessage = "Changes saved." }: { endpoint: string; payload: unknown; method?: string; children: ReactNode; confirm?: string; successMessage?: string }) {
  const mutation = usePortalMutation(); const { t } = useLanguage();
  return <div className="portal-inline-action"><button type="button" className="outline-button" disabled={mutation.busy} onClick={() => { if (!confirm || window.confirm(t(confirm))) void mutation.run(endpoint, payload, method, successMessage); }}>{mutation.busy ? <LoaderCircle size={15} className="spin" /> : <T>{children}</T>}</button><Feedback {...mutation} /></div>;
}

export function SaveWorkerButton({ workerId, saved }: { workerId: string; saved: boolean }) {
  const mutation = usePortalMutation();
  return <div className="portal-inline-action"><button type="button" className="outline-button" disabled={mutation.busy} aria-pressed={saved} onClick={() => void mutation.run("/api/v1/saved-workers", { workerId, saved: !saved }, "PATCH", saved ? "Worker removed from saved list." : "Worker saved.")}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /><T>{saved ? "Remove saved worker" : "Save worker"}</T></button><Feedback {...mutation} /></div>;
}

const actionLabels: Record<string, string> = { accept: "Accept", reject: "Decline", schedule: "Schedule", en_route: "Mark en route", start: "Start service", complete: "Complete service", cancel: "Cancel request", dispute: "Open dispute" };
export function RequestActions({ id, status, role }: { id: string; status: string; role: AppRole }) {
  const mutation = usePortalMutation();
  const actions = availableRequestActions(role, status);
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await mutation.run(`/api/v1/requests/${id}/status`, { action: selected, note, ...(selected === "complete" ? { earningAmount: Number(amount) } : {}), ...(selected === "schedule" ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}) }, "POST", "Request updated.");
    if (result) { setSelected(""); setNote(""); }
  }
  if (!actions.length) return null;
  return <div className="request-action-area"><div className="portal-actions">{actions.map((action) => <button type="button" key={action} className={action === "accept" || action === "complete" ? "button" : "outline-button"} disabled={mutation.busy} onClick={() => {
    if (["complete", "schedule", "cancel", "dispute", "reject"].includes(action)) setSelected(action);
    else void mutation.run(`/api/v1/requests/${id}/status`, { action }, "POST", "Request updated.");
  }}><T>{actionLabels[action]}</T></button>)}</div>
    {selected && <form className="portal-inline-form" onSubmit={submit}><h3><T>{actionLabels[selected]}</T></h3>
      {selected === "complete" && <label><T>Final service amount (₹)</T><input type="number" required min="0" max="10000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /><small><T>Record the agreed amount. This does not collect a payment.</T></small></label>}
      {selected === "schedule" && <label><T>Confirmed date and time</T><input type="datetime-local" required value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label>}
      <label><T>{selected === "dispute" ? "Describe the issue" : "Note"}</T><textarea required={["cancel", "dispute", "reject"].includes(selected)} minLength={["cancel", "dispute", "reject"].includes(selected) ? 5 : undefined} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} rows={3} /></label>
      <div className="portal-actions"><SubmitButton busy={mutation.busy}>Confirm</SubmitButton><button type="button" className="text-button" onClick={() => setSelected("")}><T>Cancel</T></button></div></form>}
    <Feedback {...mutation} />
  </div>;
}

export function ReviewForm({ requestId }: { requestId: string }) {
  const mutation = usePortalMutation();
  const [rating, setRating] = useState("5"); const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return <details className="portal-disclosure"><summary><T>Write a review</T></summary>{submitted ? <Feedback success="Review submitted." /> : <form className="portal-inline-form" onSubmit={async (event) => { event.preventDefault(); if (await mutation.run("/api/v1/reviews", { requestId, rating: Number(rating), body }, "POST", "Review submitted.")) setSubmitted(true); }}><label><T>Rating</T><select value={rating} onChange={(event) => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{"★".repeat(score)} ({score}/5)</option>)}</select></label><label><T>Your experience</T><textarea maxLength={2000} rows={3} value={body} onChange={(event) => setBody(event.target.value)} /></label><SubmitButton busy={mutation.busy}>Submit review</SubmitButton><Feedback {...mutation} /></form>}</details>;
}

export function ReportForm({ requestId, reportedUserId }: { requestId: string; reportedUserId: string }) {
  const mutation = usePortalMutation(); const [category, setCategory] = useState("Service quality"); const [description, setDescription] = useState("");
  return <details className="portal-disclosure"><summary><T>Report a problem</T></summary><form className="portal-inline-form" onSubmit={async (event) => { event.preventDefault(); if (await mutation.run("/api/v1/reports", { requestId, reportedUserId, category, description }, "POST", "Report submitted. Our support team will review it.")) setDescription(""); }}><label><T>Issue category</T><select value={category} onChange={(event) => setCategory(event.target.value)}>{["Service quality", "No show", "Payment issue", "Safety concern", "Other"].map((value) => <option value={value} key={value}><T>{value}</T></option>)}</select></label><label><T>Describe the issue</T><textarea minLength={10} maxLength={3000} required rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label><SubmitButton busy={mutation.busy}>Submit report</SubmitButton><Feedback {...mutation} /></form></details>;
}
