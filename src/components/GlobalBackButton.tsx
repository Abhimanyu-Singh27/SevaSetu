"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export function GlobalBackButton() {
  const pathname = usePathname(); const router = useRouter(); const { t } = useLanguage();
  // Portal and detail pages provide their own contextual navigation.
  if (["/", "/login", "/register"].includes(pathname) || /^\/(admin|customer|worker|services|professionals)(\/|$)/.test(pathname)) return null;
  return <button className="global-back-button" type="button" onClick={() => router.back()}><ArrowLeft size={16} />{t("Back")}</button>;
}
