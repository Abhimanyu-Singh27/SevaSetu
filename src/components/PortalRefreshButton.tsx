"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PortalRefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return <button type="button" className="portal-refresh-button" onClick={refresh} disabled={refreshing} aria-label="Refresh dashboard data" title="Refresh dashboard data"><RefreshCw size={14} className={refreshing ? "refresh-spin" : ""} /></button>;
}
