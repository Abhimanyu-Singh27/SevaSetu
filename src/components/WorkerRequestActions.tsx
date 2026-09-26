"use client";

import { useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

type WorkerRequest = {
  id: string;
  status: string;
  description: string;
  createdAt: string;
  budget: number | null;
  service: { name: string };
  customer: { fullName: string };
};

const nextActions: Record<string, { action: string; label: string }[]> = {
  SUBMITTED: [{ action: "accept", label: "Accept" }, { action: "reject", label: "Decline" }],
  ACCEPTED: [{ action: "schedule", label: "Schedule" }],
  SCHEDULED: [{ action: "en_route", label: "Mark en route" }],
  EN_ROUTE: [{ action: "start", label: "Start service" }],
  IN_PROGRESS: [{ action: "complete", label: "Complete service" }],
};

export function WorkerRequestActions({ initialRequests }: { initialRequests: WorkerRequest[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function transition(request: WorkerRequest, action: string) {
    setBusyId(request.id);
    setError("");
    try {
      const amount = Number(amounts[request.id]);
      if (action === "complete" && (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000)) {
        throw new Error("Enter the final service amount before completing this job.");
      }
      const response = await fetch(`/api/v1/requests/${request.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ action, ...(action === "complete" ? { earningAmount: amount } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to update request.");
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: result.data.status } : item));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update request.");
    } finally {
      setBusyId("");
    }
  }

  if (!requests.length) return <div className="workspace-empty"><Check size={24} /><h2>No open service requests</h2><p>New requests assigned to you will appear here.</p></div>;

  return <div className="worker-request-list">
    {error && <p className="auth-error" role="alert">{error}</p>}
    {requests.map((request) => {
      const actions = nextActions[request.status] || [];
      return <article className="worker-request-item" key={request.id}>
        <header><div><span className="kicker">{request.service.name}</span><h2>{request.customer.fullName}</h2></div><span className="status-pill">{request.status.replaceAll("_", " ")}</span></header>
        <p>{request.description}</p>
        <small>Received {new Date(request.createdAt).toLocaleString("en-IN")}{request.budget !== null ? ` · Customer budget ₹${request.budget}` : ""}</small>
        {request.status === "IN_PROGRESS" && <label className="worker-earning-input">Final service amount (₹)<input type="number" min="0" max="10000000" step="0.01" required value={amounts[request.id] || ""} onChange={(event) => setAmounts((current) => ({ ...current, [request.id]: event.target.value }))} /></label>}
        {!!actions.length && <div className="worker-request-actions">{actions.map(({ action, label }) => <button className={action === "reject" ? "outline-button" : "button"} type="button" key={action} disabled={busyId === request.id} onClick={() => transition(request, action)}>{busyId === request.id ? <LoaderCircle className="spin" size={15} /> : action === "reject" ? <X size={15} /> : <Check size={15} />}{label}</button>)}</div>}
      </article>;
    })}
  </div>;
}