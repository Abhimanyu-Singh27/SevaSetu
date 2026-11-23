import { notFound } from "next/navigation";
import { requireSession, type AppRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleSections, sectionTitles, queryString, type PortalQuery } from "@/lib/portal-config";
import { PortalFrame } from "./portal/PortalFrame";
import { RequestsView } from "./portal/RequestsView";
import { MarketplaceView } from "./portal/MarketplaceView";
import { NotificationsView } from "./portal/NotificationsView";
import { ReviewsView } from "./portal/ReviewsView";
import { AnalyticsView } from "./portal/AnalyticsView";
import { ProfileView, SettingsView, AvailabilityView } from "./portal/AccountViews";
import { ServicesEditor } from "./portal/ServicesEditor";
import { AdminAuditView, AdminBroadcastsView, AdminCatalogView, AdminFinanceView, AdminModerationView, AdminUsersView, AdminVerificationView } from "./portal/AdminViews";
import { MessagesPanel } from "./MessagesPanel";
import { WorkerVerificationForm } from "./WorkerVerificationForm";

const descriptions: Record<string, string> = {
  services: "Find the right professional and send a service request.", requests: "Track requests, confirm the next step, and keep a complete service history.",
  active: "Manage your accepted appointments and work in progress.", completed: "Review completed jobs, recorded amounts, and customer feedback.", history: "Your completed bookings, service details, and reviews in one place.",
  saved: "Your saved professionals, ready for your next booking.", messages: "Discuss job details with the people connected to your requests.",
  reviews: "Feedback from completed services, with ratings you can trace to a real booking.", notifications: "Stay up to date and manage what you have read.",
  profile: "Keep your contact details, experience, and service address up to date.", settings: "Manage language, appearance, and account security.",
  availability: "Let customers know when you can take on new work.", pricing: "Publish your services and keep your pricing clear.",
  verification: "Submit your identity document and track its review status.", analytics: "Understand your activity using actual request and earnings records.",
  users: "Search customer and worker accounts and manage their access.", categories: "Create and maintain the categories and services customers can book.",
  reports: "Review participant reports and record a clear decision.", disputes: "Investigate service disputes and communicate their resolution.",
  finance: "Review recorded earnings, fees, refunds, and payouts.", broadcasts: "Send relevant account notifications and review past broadcasts.",
  audit: "Trace administrative and service actions to the account that performed them.", fraud: "Review recorded fraud signals and document your findings.",
};

export async function PortalSection({ role, section, query = {} }: { role: AppRole; section: string[]; query?: PortalQuery }) {
  const session = await requireSession([role]);
  const key = section[0];
  if (section.length !== 1 || !roleSections[role].includes(key)) notFound();
  let title = sectionTitles[key]; let description = descriptions[key]; let content;
  if (["requests", "history", "active", "completed"].includes(key)) content = await RequestsView({ session, section: key, query });
  else if (key === "services" && role === "CUSTOMER" || key === "saved") content = await MarketplaceView({ userId: session.userId, query, savedOnly: key === "saved" });
  else if ((key === "services" || key === "pricing") && role === "WORKER") {
    title = "Services & pricing"; description = descriptions.pricing;
    const [offerings, services] = await Promise.all([
      prisma.workerService.findMany({ where: { worker: { userId: session.userId } }, orderBy: { service: { name: "asc" } }, include: { service: { select: { name: true, active: true } } } }),
      prisma.service.findMany({ where: { active: true, category: { active: true } }, select: { id: true, name: true, category: { select: { name: true } } }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] }),
    ]);
    content = <ServicesEditor offerings={offerings.map((item) => ({ serviceId: item.serviceId, price: item.price === null ? null : Number(item.price), pricingType: item.pricingType, description: item.description, service: item.service }))} services={services} />;
  } else if (key === "messages") content = <MessagesPanel currentUserId={session.userId} initialConversationId={queryString(query, "conversation")} role={role.toLowerCase()} />;
  else if (key === "notifications") content = await NotificationsView({ userId: session.userId, role: role.toLowerCase(), query });
  else if (key === "reviews") content = await ReviewsView({ session, query });
  else if (key === "analytics") content = await AnalyticsView({ session });
  else if (key === "profile") content = await ProfileView({ session });
  else if (key === "settings") content = await SettingsView({ session });
  else if (key === "availability") content = await AvailabilityView({ session });
  else if (key === "verification") {
    if (role === "ADMIN") { description = "Review private government identity submissions before verifying worker profiles."; content = await AdminVerificationView(); }
    else content = <WorkerVerificationForm />;
  } else if (key === "users") content = await AdminUsersView({ query });
  else if (key === "categories") content = await AdminCatalogView();
  else if (key === "finance") content = await AdminFinanceView({ query });
  else if (key === "broadcasts") content = await AdminBroadcastsView({ query });
  else if (key === "audit") content = await AdminAuditView({ query });
  else if (["reports", "disputes", "fraud"].includes(key)) content = await AdminModerationView({ kind: key === "reports" ? "report" : key === "disputes" ? "dispute" : "fraud", query });
  else notFound();
  return <PortalFrame role={role} title={title} description={description}>{content}</PortalFrame>;
}
