"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export function AccountMenu({ name, role }: { name: string; role: "admin" | "worker" | "customer"; language?: string }) {
  const { t } = useLanguage(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const router = useRouter(); const container = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const id = useId();
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  async function logout() {
    setBusy(true); setError("");
    try { const response = await fetch("/api/v1/auth/logout", { method: "POST" }); if (!response.ok) throw new Error(); router.replace("/login"); router.refresh(); }
    catch { setError("Unable to sign out. Please try again."); setBusy(false); }
  }
  return <div className="account-menu" ref={container}><button ref={trigger} type="button" className="account-menu-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} aria-label={t("Account menu")}><span className="portal-user-avatar" aria-hidden="true">{initials}</span><strong>{name}</strong><ChevronDown size={14} className={open ? "account-menu-chevron open" : "account-menu-chevron"} /></button>{open && <nav id={id} className="account-menu-popover" aria-label={t("Account menu")}><Link href={`/${role}/profile`} onClick={() => setOpen(false)}><UserRound size={15} />{t("Profile")}</Link><Link href={`/${role}/settings`} onClick={() => setOpen(false)}><Settings size={15} />{t("Settings")}</Link><button type="button" onClick={() => void logout()} disabled={busy}><LogOut size={15} />{t(busy ? "Signing out..." : "Log out")}</button>{error && <p className="portal-feedback is-error" role="alert">{t(error)}</p>}</nav>}</div>;
}
