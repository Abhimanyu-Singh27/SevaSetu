"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalText } from "@/lib/portal-i18n";

export function DeleteRequestButton({ requestId, language = "en" }: { requestId: string; language?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm(portalText(language, "deleteConfirm"))) return;
    setBusy(true);
    const response = await fetch(`/api/v1/requests/${requestId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else setBusy(false);
  }
  return <button type="button" className="workspace-delete" onClick={remove} disabled={busy}>{busy ? portalText(language, "deleting") : portalText(language, "deleteAction")}</button>;
}
