"use client";

import { Languages } from "lucide-react";
import { useId } from "react";
import { useLanguage } from "./LanguageProvider";

export function PublicLanguagePicker() {
  const { language, setLanguage, saving, error, t } = useLanguage();
  const id = useId();
  return <div className="language-control"><label className="public-language-picker"><Languages aria-hidden="true" size={16} /><span className="sr-only">{t("Language")}</span><select value={language} disabled={saving} aria-describedby={saving || error ? id : undefined} onChange={(event) => setLanguage(event.target.value)}><option value="en">{language === "hi" ? "अंग्रेज़ी" : "English"}</option><option value="hi">हिन्दी</option></select></label>{(saving || error) && <small id={id} role={error ? "alert" : "status"}>{t(error || "Saving...")}</small>}</div>;
}
