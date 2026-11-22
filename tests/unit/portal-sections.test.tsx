import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/components/LanguageProvider";
import { PortalSection } from "@/components/PortalSection";
import { roleSections } from "@/lib/portal-config";
import type { AppRole } from "@/lib/auth";
import ServiceDetailsPage from "@/app/services/[slug]/page";
import { PortalDashboard } from "@/components/PortalDashboard";

const state = vi.hoisted(() => ({ role: "WORKER" as AppRole }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/worker", notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/auth", () => ({ requireSession: async ([role]: AppRole[]) => { state.role = role; return { userId: "11111111-1111-4111-8111-111111111111", email: "asha@example.com", role, sessionId: "11111111-1111-4111-8111-111111111111" }; } }));
vi.mock("@/lib/portal-language", () => ({ getPortalLanguage: async () => "hi" }));
vi.mock("@/components/portal/PortalFrame", async () => {
  const { LocalizedText } = await import("@/components/LocalizedText");
  return { PortalFrame: ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => <><h1><LocalizedText>{title}</LocalizedText></h1><p><LocalizedText>{description}</LocalizedText></p>{children}</> };
});
vi.mock("@/lib/prisma", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const category = { id, name: "Home repairs", slug: "home-repairs", active: true, description: null, _count: { services: 1 } };
  const service = { id, categoryId: id, name: "Electrical repair", slug: "electrical-repair", description: "Electrical repair from verified SevaSetu professionals.", category, active: true, _count: { workers: 1, requests: 1 } };
  const offering = { id, serviceId: id, service, pricingType: "FIXED", price: 1200, description: null };
  const worker = { id, userId: id, fullName: "Asha Verma", bio: null, experienceYears: 2, availability: "AVAILABLE", verificationStatus: "PENDING", serviceRadiusKm: 10, services: [offering], ratingAverage: 4.5, ratingCount: 2, _count: { requests: 1, services: 1 }, savedBy: [], createdAt: new Date("2026-01-01") };
  const request = { id, status: "IN_PROGRESS", description: "Repair the gate", serviceId: id, service, customer: { fullName: "Asha Verma", userId: id }, worker, updatedAt: new Date("2026-10-26T09:00:00Z"), createdAt: new Date("2026-10-26T09:00:00Z"), preferredDate: null, preferredTime: null, locationLabel: null, budget: 1200, history: [], reviews: [], financialEntries: [], conversation: null, dispute: null, reports: [] };
  const account = () => ({ id, email: "asha@example.com", displayName: "Asha Verma", role: state.role, preferredLanguage: "hi", phone: null, status: "ACTIVE", createdAt: new Date("2026-01-01"), lastActiveAt: null, addresses: [], customerProfile: state.role === "CUSTOMER" ? { fullName: "Asha Verma" } : null, workerProfile: state.role === "WORKER" ? worker : null, _count: { savedWorkers: 1, notifications: 1 } });
  return { prisma: {
    user: { findUniqueOrThrow: async () => account(), findUnique: async () => account(), findMany: async () => [], count: async () => 0, groupBy: async () => [] },
    serviceRequest: { count: async () => 1, findMany: async () => [request], groupBy: async (args: { by: string[] }) => args.by[0] === "serviceId" ? [{ serviceId: id, _count: { _all: 1 } }] : [{ status: "IN_PROGRESS", _count: { _all: 1 } }] },
    notification: { count: async () => 1, findMany: async () => [{ id, title: "Service request updated", body: "Electrical repair is now in progress.", type: "REQUEST_UPDATE", readAt: null, data: { requestId: id }, createdAt: new Date("2026-10-26T09:00:00Z") }] },
    workerProfile: { findUniqueOrThrow: async () => worker, findMany: async () => [worker], count: async () => 1 },
    workerService: { findMany: async () => [offering] },
    service: { findMany: async () => [service], findFirst: async () => service },
    serviceCategory: { findMany: async () => [category] },
    review: { aggregate: async () => ({ _avg: { rating: null }, _count: { _all: 0 } }), findMany: async () => [] },
    address: { findFirst: async () => null }, session: { findMany: async () => [{ id, createdAt: new Date("2026-01-01") }] },
    financialEntry: { aggregate: async () => ({ _sum: { amount: 1200 } }), groupBy: async () => [{ type: "EARNING", _sum: { amount: 1200 } }], count: async () => 0, findMany: async () => [] },
    report: { count: async () => 0, findMany: async () => [] }, disputeCase: { count: async () => 0, findMany: async () => [] }, fraudSignal: { count: async () => 0, findMany: async () => [] },
    auditLog: { count: async () => 0, findMany: async () => [] }, broadcast: { count: async () => 0, findMany: async () => [] }, verification: { count: async () => 0, groupBy: async () => [] },
  } };
});

function textOf(content: React.ReactNode) {
  return renderToStaticMarkup(<LanguageProvider initialLanguage="hi">{content}</LanguageProvider>).replace(/<[^>]*>/g, " ").replaceAll("Asha Verma", "").replaceAll("asha@example.com", "").replaceAll("Repair the gate", "");
}
describe("real-data portal sections", () => {
  it.each(["customer", "worker", "admin"] as const)("renders the %s dashboard from recorded data", async (role) => {
    const content = await PortalDashboard({ role });
    expect(textOf(content)).not.toMatch(/[A-Za-z]/);
    expect(textOf(content)).not.toContain("2,500");
    expect(textOf(content)).not.toContain("18,000");
  });
  for (const role of ["CUSTOMER", "WORKER", "ADMIN"] as const) {
    it.each(roleSections[role])(`renders the ${role} %s page completely in Hindi`, async (section) => {
      const content = await PortalSection({ role, section: [section] });
      expect(textOf(content), `${role}/${section}`).not.toMatch(/[A-Za-z]/);
    });
  }
  it("returns not found for unsupported and cross-role sections", async () => {
    await expect(PortalSection({ role: "CUSTOMER", section: ["categories"] })).rejects.toThrow("NOT_FOUND");
    await expect(PortalSection({ role: "WORKER", section: ["unknown"] })).rejects.toThrow("NOT_FOUND");
    await expect(PortalSection({ role: "ADMIN", section: ["profile", "extra"] })).rejects.toThrow("NOT_FOUND");
  });
  it("renders public details from actual catalog and worker records", async () => {
    const content = await ServiceDetailsPage({ params: Promise.resolve({ slug: "electrical-repair" }) });
    expect(textOf(content)).not.toMatch(/[A-Za-z]/);
    expect(textOf(content)).toContain("1");
  });
});
