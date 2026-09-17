"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm("Delete this service request and its related records?")) return;
    setBusy(true);
    const response = await fetch(`/api/v1/requests/${requestId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else setBusy(false);
  }
  return <button type="button" className="workspace-delete" onClick={remove} disabled={busy}>{busy ? "Deleting..." : "Delete"}</button>;
}
