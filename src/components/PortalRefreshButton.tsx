"use client";

import { LocalizedButton } from "@/components/LocalizedText";

import { useLanguage } from "@/components/LanguageProvider";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { portalText } from "@/lib/portal-i18n";

export function PortalRefreshButton() {
  const { language } = useLanguage();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return <LocalizedButton type="button" className="portal-refresh-button" onClick={refresh} disabled={refreshing} aria-label={portalText(language, "refreshDashboard")} title={portalText(language, "refreshDashboard")}><RefreshCw size={14} className={refreshing ? "refresh-spin" : ""} /></LocalizedButton>;
}
