"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Clock3, ClipboardList, LayoutDashboard, MessageCircle, Settings, ShieldCheck, Users, Wrench, Moon, Sun, Menu, X, FileText, FolderKanban, Star, UserRound, Bookmark, Search, Send } from "lucide-react";
import { SevaSetuLogo } from "./SevaSetuLogo";
import { PublicLanguagePicker } from "./PublicLanguagePicker";
import { useLanguage } from "./LanguageProvider";
import type { PortalRole } from "@/lib/portal-config";

const navigation: Record<PortalRole, { section: string; label: string; icon: typeof LayoutDashboard; badge?: string }[]> = {
  customer: [
    { section: "", label: "Dashboard", icon: LayoutDashboard }, { section: "services", label: "Search services", icon: Search },
    { section: "requests", label: "My requests", icon: ClipboardList, badge: "requests" }, { section: "history", label: "Service history", icon: FileText },
    { section: "messages", label: "Messages", icon: MessageCircle, badge: "messages" }, { section: "saved", label: "Saved workers", icon: Bookmark },
    { section: "reviews", label: "Reviews", icon: Star, badge: "reviews" }, { section: "notifications", label: "Notifications", icon: Bell, badge: "notifications" }, { section: "profile", label: "Profile", icon: UserRound },
  ],
  worker: [
    { section: "", label: "Dashboard", icon: LayoutDashboard }, { section: "requests", label: "Requests", icon: ClipboardList, badge: "requests" },
    { section: "active", label: "Active services", icon: FolderKanban, badge: "active" }, { section: "completed", label: "Completed services", icon: FileText },
    { section: "services", label: "Services & pricing", icon: Wrench }, { section: "availability", label: "Availability", icon: Clock3 },
    { section: "messages", label: "Messages", icon: MessageCircle, badge: "messages" }, { section: "reviews", label: "Reviews", icon: Star, badge: "reviews" },
    { section: "analytics", label: "Analytics", icon: BarChart3 }, { section: "verification", label: "Verification", icon: ShieldCheck, badge: "verification" },
    { section: "notifications", label: "Notifications", icon: Bell, badge: "notifications" }, { section: "profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { section: "", label: "Dashboard", icon: LayoutDashboard }, { section: "users", label: "Users", icon: Users },
    { section: "categories", label: "Service catalog", icon: FolderKanban }, { section: "requests", label: "Service requests", icon: ClipboardList },
    { section: "verification", label: "Verification", icon: ShieldCheck, badge: "verification" }, { section: "reports", label: "Reports & complaints", icon: Bell, badge: "reports" },
    { section: "disputes", label: "Disputes", icon: ShieldCheck, badge: "disputes" }, { section: "reviews", label: "Reviews", icon: Star },
    { section: "finance", label: "Finance", icon: FileText }, { section: "broadcasts", label: "Broadcasts", icon: Send },
    { section: "analytics", label: "Analytics", icon: BarChart3 }, { section: "audit", label: "Audit logs", icon: FileText },
    { section: "notifications", label: "Notifications", icon: Bell, badge: "notifications" }, { section: "profile", label: "Profile", icon: UserRound },
  ],
};

export function AccountSidebar({ role, badges = {} }: { role: PortalRole; badges?: Record<string, number> }) {
  const pathname = usePathname(); const { t } = useLanguage();
  const [dark, setDark] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const [liveBadges, setLiveBadges] = useState(badges);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.dataset.theme === "dark");
    try { document.documentElement.dataset.theme = localStorage.getItem("sevasetu-theme") === "dark" ? "dark" : "light"; } catch { /* Keep the current theme. */ }
    queueMicrotask(sync); window.addEventListener("sevasetu:theme", sync);
    return () => window.removeEventListener("sevasetu:theme", sync);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => { if (!document.hidden) void fetch("/api/sidebar-badges", { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((result) => { if (result && !controller.signal.aborted) setLiveBadges(result); }).catch(() => undefined); };
    load(); const timer = window.setInterval(load, 60000); window.addEventListener("sevasetu:refresh", load); document.addEventListener("visibilitychange", load);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("sevasetu:refresh", load); document.removeEventListener("visibilitychange", load); };
  }, [pathname]);
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; try { localStorage.setItem("sevasetu-theme", next ? "dark" : "light"); } catch { /* The current tab still applies the theme. */ } window.dispatchEvent(new Event("sevasetu:theme")); }
  return <aside className="portal-sidebar"><Link className="portal-brand" href="/" aria-label="SevaSetu home"><SevaSetuLogo compact /></Link><button className="mobile-nav-toggle" type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-controls="portal-navigation">{mobileOpen ? <X /> : <Menu />}<span>{t(mobileOpen ? "Close menu" : "Open menu")}</span></button><nav id="portal-navigation" className={`portal-nav${mobileOpen ? " mobile-open" : ""}`} aria-label={t(role === "admin" ? "Admin navigation" : role === "customer" ? "Customer navigation" : "Worker navigation")}>{navigation[role].map(({ section, label, icon: Icon, badge }) => { const href = `/${role}${section ? `/${section}` : ""}`; const active = pathname === href || (section && pathname.startsWith(`${href}/`)); return <Link key={section} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" /><span>{t(label)}</span>{badge && liveBadges[badge] > 0 && <b className="sidebar-badge">{liveBadges[badge] > 99 ? "99+" : liveBadges[badge]}</b>}</Link>; })}</nav><div className="portal-settings"><Link className="settings-link" href={`/${role}/settings`} aria-current={pathname === `/${role}/settings` ? "page" : undefined}><Settings size={17} />{t("Settings")}</Link><div className="theme-row"><span>{t(dark ? "Dark mode" : "Light mode")}</span><button className={`theme-toggle${dark ? " active" : ""}`} type="button" onClick={toggleTheme} aria-label={t(dark ? "Light mode" : "Dark mode")} aria-pressed={dark}><span>{dark ? <Moon size={11} /> : <Sun size={11} />}</span></button></div><div className="language-row"><span>{t("Language")}</span><PublicLanguagePicker /></div></div></aside>;
}
