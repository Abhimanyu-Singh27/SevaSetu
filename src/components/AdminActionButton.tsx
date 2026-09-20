"use client";

import { useState } from "react";

export function AdminActionButton({ endpoint, id, label, status }: { endpoint: string; id: string; label: string; status: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function update() {
    setLoading(true);
    const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setMessage(response.ok ? "Saved" : "Unable to save");
    setLoading(false);
  }
  return <button className="outline-button" type="button" onClick={update} disabled={loading}>{loading ? "Saving..." : message || label}</button>;
}
