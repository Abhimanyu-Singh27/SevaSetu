"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, LoaderCircle, ShieldCheck, X } from "lucide-react";

type PendingVerification = { id: string; workerId: string; workerName: string; email: string; submittedAt: string | null; contentType: string | null; sizeBytes: number | null; documentUrl: string };

export function AdminVerificationQueue() {
  const [items, setItems] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/verifications", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load verification queue.");
      setItems(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load verification queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function decide(item: PendingVerification, decision: "approve" | "reject") {
    const note = notes[item.id]?.trim() || "";
    if (decision === "reject" && note.length < 5) {
      setError("Add a short reason before rejecting the document.");
      return;
    }
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, decision, notes: note }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to update verification.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update verification.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="admin-verification-queue" aria-label="Pending worker identity reviews">
    {error && <p className="verification-message error" role="alert">{error}</p>}
    {loading ? <div className="workspace-empty"><LoaderCircle className="spin" size={22} /><p>Loading verification requests...</p></div> : items.length ? items.map((item) => <article className="admin-verification-item" key={item.id}>
      <header><span className="workspace-row-icon"><ShieldCheck size={17} /></span><div><h2>{item.workerName}</h2><p>{item.email}</p></div><span className="verification-status status-pending">Pending review</span></header>
      <div className="admin-verification-document"><span>{item.contentType || "Identity document"} · {Math.ceil((item.sizeBytes || 0) / 1024)} KB</span><a href={item.documentUrl} target="_blank" rel="noopener noreferrer">Open private document <ExternalLink size={14} /></a></div>
      <label className="admin-verification-notes">Review note<textarea rows={2} maxLength={500} value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Required when rejecting" /></label>
      <div className="admin-verification-actions"><button className="button" type="button" disabled={busyId === item.id} onClick={() => decide(item, "approve")}>{busyId === item.id ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Approve identity</button><button className="outline-button" type="button" disabled={busyId === item.id} onClick={() => decide(item, "reject")}><X size={16} /> Reject</button></div>
    </article>) : <div className="workspace-empty"><ShieldCheck size={25} /><h2>No pending identity reviews</h2><p>Worker submissions will appear here after secure upload checks pass.</p></div>}
  </section>;
}