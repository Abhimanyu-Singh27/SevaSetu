"use client";

import { Languages } from "lucide-react";
import { useEffect, useState } from "react";

const languages = [["en", "English"], ["hi", "हिन्दी"]] as const;

export function PublicLanguagePicker({ onLanguageChange }: { onLanguageChange?: (language: string) => void }) {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("sevasetu-language");
    if (saved === "hi") {
      queueMicrotask(() => setLanguage(saved));
      document.documentElement.lang = saved;
    }
  }, []);

  function changeLanguage(value: string) {
    setLanguage(value);
    window.localStorage.setItem("sevasetu-language", value);
    document.documentElement.lang = value;
    onLanguageChange?.(value);
  }

  return <label className="public-language-picker"><Languages aria-hidden="true" size={16} /><span className="sr-only">Language</span><select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label="Language">{languages.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>;
}
