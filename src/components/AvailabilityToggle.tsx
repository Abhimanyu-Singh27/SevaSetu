"use client";

import { useState } from "react";
import { portalText } from "@/lib/portal-i18n";

export function AvailabilityToggle({ initial, language = "en" }: { initial: string; language?: string }) {
  const [availability, setAvailability] = useState(initial);
  const [busy, setBusy] = useState(false);
  const next = availability === "AVAILABLE" ? "BUSY" : availability === "BUSY" ? "OFFLINE" : "AVAILABLE";
  async function change() {
    setBusy(true);
    const response = await fetch("/api/v1/workers/availability", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ availability: next }) });
    if (response.ok) setAvailability(next);
    setBusy(false);
  }
  return <div className="worker-status-row"><span><span className={`availability-dot ${availability.toLowerCase()}`} />{availability.replaceAll("_", " ")}</span><button type="button" onClick={change} disabled={busy}>{busy ? portalText(language, "savingAction") : portalText(language, "setStatus", { status: next.toLowerCase() })}</button></div>;
}
