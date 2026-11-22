import { cookies } from "next/headers";
import { normalizePortalLanguage } from "./portal-i18n";

export async function getPortalLanguage(accountLanguage?: string | null) {
  const selected = (await cookies()).get("sevasetu-language")?.value;
  return normalizePortalLanguage(selected === "en" || selected === "hi" ? selected : accountLanguage);
}
