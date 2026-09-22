"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasPageBackLink, setHasPageBackLink] = useState(true);

  useEffect(() => {
    setHasPageBackLink(Boolean(document.querySelector(".back-link")));
  }, [pathname]);

  if (pathname === "/" || pathname === "/admin" || pathname === "/customer" || pathname === "/worker" || pathname === "/login" || pathname === "/register" || pathname === "/admin/login") return null;
  if (hasPageBackLink) return null;

  return <button className="global-back-button" type="button" onClick={() => router.back()}><ArrowLeft size={16} /> Back</button>;
}
