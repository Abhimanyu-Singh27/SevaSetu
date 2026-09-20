"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Clock3,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wrench,
  Moon,
  Sun,
  Menu,
  X,
  Languages,
  FileText,
  FolderKanban,
  Star,
  UserRound,
} from "lucide-react";
import { SevaSetuLogo } from "./SevaSetuLogo";
import { portalNavigation, portalText } from "@/lib/portal-i18n";

type AccountRole = "customer" | "worker" | "admin";

const navigation: Record<AccountRole, { label: string; href: string; icon: typeof LayoutDashboard }[]> = {
  customer: [
    { label: "Dashboard", href: "/customer", icon: LayoutDashboard },
    { label: "Search services", href: "/#services", icon: SlidersHorizontal },
    { label: "My requests", href: "/customer/requests", icon: ClipboardList },
    { label: "Service history", href: "/customer/history", icon: FileText },
    { label: "Messages", href: "/customer/messages", icon: MessageCircle },
    { label: "Saved workers", href: "/customer/saved", icon: BriefcaseBusiness },
    { label: "Reviews", href: "/customer/reviews", icon: Star },
    { label: "Notifications", href: "/customer/notifications", icon: Bell },
    { label: "Profile", href: "/customer/profile", icon: UserRound },
  ],
  worker: [
    { label: "Dashboard", href: "/worker", icon: LayoutDashboard },
    { label: "Requests", href: "/worker/requests", icon: ClipboardList },
    { label: "Messages", href: "/worker/messages", icon: MessageCircle },
    { label: "Active services", href: "/worker/active", icon: FolderKanban },
    { label: "Completed services", href: "/worker/completed", icon: FileText },
    { label: "My services", href: "/worker/services", icon: Wrench },
    { label: "Skills & pricing", href: "/worker/pricing", icon: SlidersHorizontal },
    { label: "Availability", href: "/worker/availability", icon: Clock3 },
    { label: "Reviews", href: "/worker/reviews", icon: Star },
    { label: "Analytics", href: "/worker/analytics", icon: BarChart3 },
    { label: "Profile", href: "/worker/profile", icon: UserRound },
    { label: "Verification", href: "/worker/verification", icon: ShieldCheck },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Workers", href: "/admin/workers", icon: BriefcaseBusiness },
    { label: "Verification", href: "/admin/verification", icon: ShieldCheck },
    { label: "Service categories", href: "/admin/categories", icon: FolderKanban },
    { label: "Service requests", href: "/admin/requests", icon: ClipboardList },
    { label: "Finance", href: "/admin/finance", icon: FileText },
    { label: "Fraud signals", href: "/admin/fraud", icon: ShieldCheck },
    { label: "Disputes", href: "/admin/disputes", icon: Bell },
    { label: "Broadcasts", href: "/admin/broadcasts", icon: Bell },
    { label: "Reports & complaints", href: "/admin/reports", icon: Bell },
    { label: "Reviews", href: "/admin/reviews", icon: Star },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Audit logs", href: "/admin/audit", icon: FileText },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
  ],
};

const roleNames: Record<AccountRole, string> = { customer: "Customer", worker: "Worker", admin: "Admin" };
const languages = [
  ["en", "English"], ["hi", "हिन्दी"],
] as const;
const badgeKeys: Record<string, string> = {
  "My requests": "requests",
  Requests: "requests",
  "Active services": "services",
  "Saved workers": "saved",
  Reviews: "reviews",
  Notifications: "notifications",
  Messages: "messages",
  Verification: "verification",
  "Reports & complaints": "reports",
};

export function AccountSidebar({ role, badges = {} }: { role: AccountRole; badges?: Record<string, number> }) {
  const [dark, setDark] = useState(false);
  const [liveBadges, setLiveBadges] = useState(badges);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [languageMessage, setLanguageMessage] = useState("");
  const pathname = usePathname();
  const translatedNavigation = portalNavigation(language);
  const translatedLabels: Record<string, string> = {
    Dashboard: translatedNavigation.dashboard, "Search services": translatedNavigation.searchServices, "My requests": translatedNavigation.requests,
    "Service history": translatedNavigation.serviceHistory, Messages: translatedNavigation.messages, "Saved workers": translatedNavigation.savedWorkers,
    Reviews: translatedNavigation.reviews, Notifications: translatedNavigation.notifications, Profile: translatedNavigation.profile,
    "Active services": translatedNavigation.activeServices, "Completed services": translatedNavigation.completedServices, "My services": translatedNavigation.myServices,
    "Skills & pricing": translatedNavigation.skillsPricing, Availability: translatedNavigation.availability, Analytics: translatedNavigation.analytics,
    Verification: translatedNavigation.verification, Settings: translatedNavigation.settings,
  };

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sevasetu-theme");
    const isDark = savedTheme === "dark";
    queueMicrotask(() => setDark(isDark));
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  useEffect(() => {
    fetch("/api/v1/account/preferences", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.data?.preferredLanguage) setLanguage(data.data.preferredLanguage); })
      .catch(() => undefined);
  }, [role]);

  useEffect(() => {
    let active = true;
    fetch("/api/sidebar-badges", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: Record<string, number> | null) => {
        if (active && data) setLiveBadges(data);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  function toggleTheme() {
    const nextIsDark = !dark;
    setDark(nextIsDark);
    window.localStorage.setItem("sevasetu-theme", nextIsDark ? "dark" : "light");
    document.documentElement.dataset.theme = nextIsDark ? "dark" : "light";
  }

  async function changeLanguage(value: string) {
    const previous = language;
    setLanguage(value);
    setLanguageMessage("Saving...");
    try {
      const response = await fetch("/api/v1/account/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferredLanguage: value }) });
      if (!response.ok) throw new Error("Unable to save language");
      setLanguageMessage("Saved");
      window.setTimeout(() => setLanguageMessage(""), 1600);
    } catch {
      setLanguage(previous);
      setLanguageMessage("Unable to save");
    }
  }

  return (
    <aside className="portal-sidebar">
      <Link className="portal-brand" href="/" aria-label="SevaSetu home">
        <SevaSetuLogo compact />
      </Link>
      <button className="mobile-nav-toggle" type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="portal-navigation">
        {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}<span>{mobileOpen ? portalText(language, "closeMenu") : portalText(language, "openMenu")}</span>
      </button>
      <nav id="portal-navigation" className={`portal-nav${mobileOpen ? " mobile-open" : ""}`} aria-label={role === "customer" ? portalText(language, "customerNavigation") : role === "worker" ? portalText(language, "workerNavigation") : `${roleNames[role]} navigation`}>
        {navigation[role].map(({ label, href, icon: Icon }) => (
          <Link href={href} onClick={() => setMobileOpen(false)} aria-current={pathname === href ? "page" : undefined} key={label}>
            <Icon aria-hidden="true" /><span>{translatedLabels[label] || label}</span>
              {liveBadges[badgeKeys[label]] > 0 ? <b className="sidebar-badge">{liveBadges[badgeKeys[label]] > 99 ? "99+" : liveBadges[badgeKeys[label]]}</b> : null}
          </Link>
        ))}
      </nav>
      <div className="portal-settings">
        <a className="settings-link" href={`/${role}/settings`}>
          <Settings aria-hidden="true" size={17} /><span>{translatedNavigation.settings}</span>
        </a>
        <div className="theme-row">
          <span>{dark ? portalText(language, "darkMode") : portalText(language, "lightMode")}</span>
          <button className={`theme-toggle${dark ? " active" : ""}`} type="button" onClick={toggleTheme} aria-label={dark ? portalText(language, "lightMode") : portalText(language, "darkMode")} aria-pressed={dark}>
            <span>{dark ? <Moon size={11} /> : <Sun size={11} />}</span>
          </button>
        </div>
        <label className="language-row"><span><Languages aria-hidden="true" size={17} /> {translatedNavigation.language}</span><select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label={translatedNavigation.language}>{languages.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{languageMessage && <small aria-live="polite">{languageMessage === "Saving..." ? portalText(language, "saving") : languageMessage === "Saved" ? portalText(language, "saved") : portalText(language, "saveFailed")}</small>}</label>
      </div>
    </aside>
  );
}
