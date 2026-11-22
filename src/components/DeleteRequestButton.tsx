"use client";

import { LocalizedText } from "@/components/LocalizedText";

import { useLanguage } from "@/components/LanguageProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalText } from "@/lib/portal-i18n";

export function DeleteRequestButton({ requestId }: { requestId: string; language?: string }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm(portalText(language, "deleteConfirm"))) return;
    setBusy(true);
    const response = await fetch(`/api/v1/requests/${requestId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else setBusy(false);
  }
  return <button type="button" className="workspace-delete" onClick={remove} disabled={busy}><LocalizedText>{busy ? portalText(language, "deleting") : portalText(language, "deleteAction")}</LocalizedText></button>;
}
