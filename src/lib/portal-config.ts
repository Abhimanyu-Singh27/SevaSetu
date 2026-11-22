import type { AppRole } from "./auth";
import type { Prisma } from "@prisma/client";

export type PortalRole = "customer" | "worker" | "admin";
export type PortalQuery = Record<string, string | string[] | undefined>;

export const activeStatuses = ["SUBMITTED", "SENT", "ACCEPTED", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS"] as const;
export const sectionTitles: Record<string, string> = {
  services: "Search services", requests: "Service requests", history: "Service history", saved: "Saved workers",
  reviews: "Reviews", messages: "Messages", notifications: "Notifications", profile: "Profile", settings: "Settings",
  active: "Active services", completed: "Completed services", pricing: "Services & pricing", availability: "Availability",
  analytics: "Analytics", verification: "Verification", users: "Users", categories: "Service catalog", audit: "Audit logs",
  reports: "Reports & complaints", finance: "Finance", disputes: "Disputes", broadcasts: "Broadcasts", fraud: "Fraud signals",
};
export const roleSections: Record<AppRole, readonly string[]> = {
  CUSTOMER: ["services", "requests", "history", "saved", "reviews", "messages", "notifications", "profile", "settings"],
  WORKER: ["requests", "active", "completed", "services", "pricing", "availability", "reviews", "analytics", "verification", "messages", "notifications", "profile", "settings"],
  ADMIN: ["users", "categories", "requests", "completed", "verification", "reports", "disputes", "finance", "fraud", "broadcasts", "reviews", "analytics", "audit", "notifications", "profile", "settings"],
};
export function requestScope(role: AppRole, userId: string): Prisma.ServiceRequestWhereInput {
  return role === "CUSTOMER" ? { customer: { userId } } : role === "WORKER" ? { worker: { userId } } : {};
}
export function queryString(query: PortalQuery, key: string) { return typeof query[key] === "string" ? query[key] as string : ""; }
export function pageNumber(value: unknown) { const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 100000) : 1; }
export const pageSize = 12;

export function availableRequestActions(role: AppRole, status: string) {
  if (role === "ADMIN") return [];
  const actions: string[] = [];
  if (role === "WORKER") {
    const next: Record<string, string[]> = { SUBMITTED: ["accept", "reject"], SENT: ["accept", "reject"], ACCEPTED: ["schedule"], SCHEDULED: ["en_route"], EN_ROUTE: ["start"], IN_PROGRESS: ["complete"] };
    actions.push(...(next[status] || []));
  }
  if (["DRAFT", "SUBMITTED", "SENT", "ACCEPTED", "SCHEDULED"].includes(status)) actions.push("cancel");
  if (["ACCEPTED", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED"].includes(status)) actions.push("dispute");
  return actions;
}
