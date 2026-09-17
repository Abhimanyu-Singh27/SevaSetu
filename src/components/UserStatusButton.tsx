"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

export function UserStatusButton({ userId, status }: { userId: string; status: "ACTIVE" | "BLOCKED" | "SUSPENDED" | "DEACTIVATED" }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [loading, setLoading] = useState(false);

  async function toggleStatus() {
    setLoading(true);
    const nextStatus = currentStatus === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    const response = await fetch(`/api/v1/admin/users/${userId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    if (response.ok) setCurrentStatus(nextStatus);
    setLoading(false);
  }

  return <button type="button" className={`button ${currentStatus === "BLOCKED" ? "outline-button" : "danger-button"}`} onClick={toggleStatus} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15} /> : currentStatus === "BLOCKED" ? "Unblock" : "Block"}</button>;
}