import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AccountSidebar } from "@/components/AccountSidebar";
import { WorkerRequestActions } from "@/components/WorkerRequestActions";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { AvailabilityToggle } from "@/components/AvailabilityToggle";
import { WorkerVerificationForm } from "@/components/WorkerVerificationForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/worker" }));

const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
const hindi = (children: React.ReactNode) => plainText(renderToStaticMarkup(<LanguageProvider initialLanguage="hi">{children}</LanguageProvider>));

describe("Hindi portal rendering", () => {
  it.each(["customer", "worker", "admin"] as const)("translates every %s navigation item, preserving the logo", (role) => {
    const text = hindi(<AccountSidebar role={role} />);
    expect(text).toContain("Seva");
    expect(text).toContain("Har Seva, Ek Setu.");
    expect(text.replace("Seva", "").replace("Setu", "").replace("Har Seva, Ek Setu.", "")).not.toMatch(/[A-Za-z]/);
  });

  it("translates job actions, service labels, and status without changing customer content", () => {
    const text = hindi(<WorkerRequestActions initialRequests={[{ id: "request-1", status: "IN_PROGRESS", description: "Repair the gate", createdAt: "2026-10-26T09:00:00Z", budget: 800, service: { name: "Electrical repair" }, customer: { fullName: "Asha Verma" } }]} />);
    expect(text).toContain("बिजली की मरम्मत");
    expect(text).toContain("सेवा पूरी करें");
    expect(text).toContain("Asha Verma");
    expect(text).toContain("Repair the gate");
    expect(text.replace("Asha Verma", "").replace("Repair the gate", "")).not.toMatch(/[A-Za-z]/);
  });

  it("translates profile forms and their service catalog", () => {
    const text = hindi(<ProfileEditForm user={{ role: "WORKER", phone: null, addresses: [], customerProfile: null, workerProfile: { fullName: "Asha Verma", bio: null, experienceYears: 2, serviceRadiusKm: 10, services: [] } }} availableServices={[{ id: "service-1", name: "Water-tank cleaning", category: { name: "Cleaning" } }]} />);
    expect(text).toContain("पानी की टंकी की सफाई");
    expect(text).not.toMatch(/[A-Za-z]/);
  });

  it("translates availability and its next action together", () => {
    const text = hindi(<AvailabilityToggle initial="AVAILABLE" />);
    expect(text).toContain("उपलब्ध");
    expect(text).toContain("व्यस्त");
    expect(text).not.toMatch(/[A-Za-z]/);
  });

  it("translates document selection and format hints", () => {
    const text = hindi(<WorkerVerificationForm />);
    expect(text).toContain("दस्तावेज़ चुनें");
    expect(text).not.toMatch(/[A-Za-z]/);
  });
});
