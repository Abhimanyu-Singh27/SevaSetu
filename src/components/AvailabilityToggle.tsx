"use client";

import { useState } from "react";
import { LocalizedText as T } from "./LocalizedText";
import { Feedback, usePortalMutation } from "./portal/Actions";

export function AvailabilityToggle({ initial }: { initial: string; language?: string }) {
  const [availability, setAvailability] = useState(initial); const mutation = usePortalMutation();
  return <div className="worker-availability-control"><div className="portal-actions">{["AVAILABLE", "BUSY", "OFFLINE"].map((value) => <button className={availability === value ? "button" : "outline-button"} key={value} type="button" aria-pressed={availability === value} disabled={mutation.busy} onClick={async () => { if (value === availability) return; if (await mutation.run("/api/v1/workers/availability", { availability: value }, "PATCH", "Availability updated.")) { setAvailability(value); window.dispatchEvent(new CustomEvent("sevasetu:availability", { detail: value })); } }}><span className={`availability-dot ${value.toLowerCase()}`} /><T>{value}</T></button>)}</div><Feedback {...mutation} /></div>;
}
