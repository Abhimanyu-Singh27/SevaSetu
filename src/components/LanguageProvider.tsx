"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { normalizePortalLanguage, translateText, type PortalLanguage } from "@/lib/portal-i18n";

type LanguageContextValue = { language: PortalLanguage; setLanguage: (value: string) => void; saving: boolean; error: string; t: (value: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ initialLanguage, children, authenticated = false }: { initialLanguage: PortalLanguage; children: ReactNode; authenticated?: boolean }) {
  const [language, updateLanguage] = useState(initialLanguage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const current = useRef(initialLanguage);
  const router = useRouter();
  const applyLanguage = useCallback((next: PortalLanguage) => {
    current.current = next;
    updateLanguage(next);
    document.documentElement.lang = next;
    document.cookie = `sevasetu-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    try { window.localStorage.setItem("sevasetu-language", next); } catch { /* Cookies still retain the preference when local storage is disabled. */ }
  }, []);
  const setLanguage = useCallback(async (value: string) => {
    const next = normalizePortalLanguage(value);
    if (pending.current || current.current === next) return;
    const previous = current.current;
    pending.current = true; setSaving(true); setError(""); applyLanguage(next);
    try {
      if (authenticated) {
        const response = await fetch("/api/v1/account/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferredLanguage: next }) });
        if (!response.ok) throw new Error("Unable to save language. Please try again.");
      }
      router.refresh();
    } catch {
      applyLanguage(previous); setError("Unable to save language. Please try again."); router.refresh();
    } finally { pending.current = false; setSaving(false); }
  }, [applyLanguage, authenticated, router]);

  useEffect(() => {
    // Migrate preferences saved before the language cookie was introduced.
    if (document.cookie.split(";").some((cookie) => cookie.trim().startsWith("sevasetu-language="))) return;
    try {
      const saved = window.localStorage.getItem("sevasetu-language");
      if (!authenticated && (saved === "hi" || saved === "en")) queueMicrotask(() => { applyLanguage(saved); router.refresh(); });
    } catch { /* Use the server preference when storage is unavailable. */ }
  }, [applyLanguage, authenticated, router]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "sevasetu-language" && (event.newValue === "en" || event.newValue === "hi")) { applyLanguage(event.newValue); router.refresh(); }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyLanguage, router]);

  const value = useMemo(() => ({ language, setLanguage, saving, error, t: (text: string) => translateText(language, text) }), [language, setLanguage, saving, error]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
