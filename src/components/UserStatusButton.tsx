"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

export function UserStatusButton({ userId, status }: { userId: string; status: "ACTIVE" | "BLOCKED" | "SUSPENDED" | "DEACTIVATED" }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [loading, setLoading] = useState(false);

  async function setStatus(nextStatus: "ACTIVE" | "BLOCKED" | "SUSPENDED" | "DEACTIVATED") {
    setLoading(true);
    const response = await fetch(`/api/v1/admin/users/${userId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    if (response.ok) setCurrentStatus(nextStatus);
    setLoading(false);
  }

  return <div className="user-status-actions"><button type="button" className={`button ${currentStatus === "BLOCKED" ? "outline-button" : "danger-button"}`} onClick={() => setStatus(currentStatus === "BLOCKED" ? "ACTIVE" : "BLOCKED")} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15} /> : currentStatus === "BLOCKED" ? "Unblock" : "Block"}</button><button type="button" className="outline-button" onClick={() => setStatus("SUSPENDED")} disabled={loading}>Suspend</button><button type="button" className="outline-button" onClick={() => setStatus("DEACTIVATED")} disabled={loading}>Deactivate</button></div>;
}