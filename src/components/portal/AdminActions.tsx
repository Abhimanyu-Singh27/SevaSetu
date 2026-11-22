"use client";

import { useState } from "react";
import { LocalizedText as T } from "@/components/LocalizedText";
import { Feedback, SubmitButton, usePortalMutation } from "./Actions";

export function ModerationForm({ id, kind, currentStatus }: { id: string; kind: "report" | "dispute" | "fraud"; currentStatus: string }) {
  const mutation = usePortalMutation(); const [status, setStatus] = useState(kind === "fraud" ? "REVIEWED" : "UNDER_REVIEW"); const [note, setNote] = useState("");
  if (["RESOLVED", "REJECTED"].includes(currentStatus)) return <p className="portal-helper"><T>Case closed</T></p>;
  return <details className="portal-disclosure"><summary><T>Update case</T></summary><form className="portal-inline-form" onSubmit={(event) => { event.preventDefault(); void mutation.run("/api/v1/admin/moderation", { id, kind, status, note, expectedStatus: currentStatus }, "PATCH", "Case updated."); }}><label><T>Decision</T><select value={status} onChange={(event) => setStatus(event.target.value)}>{(kind === "fraud" ? ["REVIEWED", "DISMISSED", "CONFIRMED"] : ["UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "REJECTED"]).map((value) => <option key={value} value={value}><T>{value}</T></option>)}</select></label><label><T>Decision notes</T><textarea required={["RESOLVED", "REJECTED", "CONFIRMED"].includes(status)} minLength={["RESOLVED", "REJECTED", "CONFIRMED"].includes(status) ? 5 : undefined} maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label><SubmitButton busy={mutation.busy} disabled={status === currentStatus}>Save decision</SubmitButton><Feedback {...mutation} /></form></details>;
}

export function AssignWorkerForm({ requestId, workers }: { requestId: string; workers: { id: string; fullName: string }[] }) {
  const mutation = usePortalMutation(); const [workerId, setWorkerId] = useState("");
  return <form className="portal-inline-form" onSubmit={(event) => { event.preventDefault(); void mutation.run(`/api/v1/requests/${requestId}/assign`, { workerId }, "POST", "Worker assigned."); }}><label><T>Assign a professional</T><select required value={workerId} onChange={(event) => setWorkerId(event.target.value)}><option value=""><T>Select a professional</T></option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.fullName}</option>)}</select></label><SubmitButton busy={mutation.busy} disabled={!workers.length}>Assign worker</SubmitButton>{!workers.length && <p className="portal-helper"><T>No available professionals offer this service yet.</T></p>}<Feedback {...mutation} /></form>;
}
