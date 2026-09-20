"use client";

import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalText } from "@/lib/portal-i18n";

export function AccountMenu({ name, role, language = "en" }: { name: string; role: "admin" | "worker" | "customer"; language?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return <div className="account-menu"><button type="button" className="account-menu-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu"><span className="portal-user-avatar">{initials}</span><strong>{name}</strong><ChevronDown size={14} className={open ? "account-menu-chevron open" : "account-menu-chevron"} /></button>{open && <div className="account-menu-popover" role="menu"><a href={`/${role}/profile`} role="menuitem"><UserRound size={15} /> {portalText(language, "profile")}</a><a href={`/${role}/settings`} role="menuitem"><Settings size={15} /> {portalText(language, "settings")}</a><button type="button" onClick={logout} role="menuitem"><LogOut size={15} /> {portalText(language, "logout")}</button></div>}</div>;
}
