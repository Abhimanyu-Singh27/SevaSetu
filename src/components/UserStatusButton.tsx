"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { LocalizedText as T } from "./LocalizedText";
import { Feedback, usePortalMutation } from "./portal/Actions";

export function UserStatusButton({ userId, status }: { userId: string; status: "ACTIVE" | "BLOCKED" | "SUSPENDED" | "DEACTIVATED" }) {
  const [current, setCurrent] = useState(status); const mutation = usePortalMutation(); const { t } = useLanguage();
  const next = current === "ACTIVE" ? "BLOCKED" : "ACTIVE";
  return <div className="portal-inline-action"><button className="outline-button" type="button" disabled={mutation.busy || current === "DEACTIVATED"} onClick={async () => { if (!window.confirm(t(next === "ACTIVE" ? "Restore access to this account?" : "Block this account and revoke its sign-in sessions?"))) return; if (await mutation.run(`/api/v1/admin/users/${userId}/status`, { status: next }, "POST", "Account status updated.")) setCurrent(next); }}><T>{next === "ACTIVE" ? "Restore access" : "Block account"}</T></button><Feedback {...mutation} /></div>;
}
