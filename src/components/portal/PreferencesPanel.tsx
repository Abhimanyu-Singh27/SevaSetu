"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LocalizedText as T } from "@/components/LocalizedText";

export function PreferencesPanel() {
  const { language, setLanguage, saving, error } = useLanguage();
  const [theme, setTheme] = useState("light");
  useEffect(() => { queueMicrotask(() => setTheme(document.documentElement.dataset.theme || "light")); }, []);
  return <section className="portal-form-card"><h2><T>Display preferences</T></h2><label><T>Language</T><select value={language} disabled={saving} onChange={(event) => setLanguage(event.target.value)}><option value="en">{language === "hi" ? "अंग्रेज़ी" : "English"}</option><option value="hi">हिन्दी</option></select><small><T>Your language applies across all pages. Names and messages stay as written.</T></small></label>{saving && <p role="status"><T>Saving...</T></p>}{error && <p role="alert" className="portal-feedback is-error"><T>{error}</T></p>}<label><T>Theme</T><select value={theme} onChange={(event) => { const next = event.target.value; setTheme(next); document.documentElement.dataset.theme = next; try { localStorage.setItem("sevasetu-theme", next); } catch { /* The current tab still applies the theme. */ } window.dispatchEvent(new Event("sevasetu:theme")); }}><option value="light"><T>Light mode</T></option><option value="dark"><T>Dark mode</T></option></select></label></section>;
}
