import { describe, expect, it } from "vitest";
import { catalogInput, workerServiceInput } from "@/lib/portal-contracts";
import { availableRequestActions, pageNumber, roleSections } from "@/lib/portal-config";
import { distanceKm, serviceSearchTerm } from "@/lib/marketplace-search";

describe("marketplace contracts", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("requires real prices for priced services, permitting free and quote-based services", () => {
    expect(workerServiceInput.safeParse({ serviceId: id, pricingType: "FIXED", price: null }).success).toBe(false);
    expect(workerServiceInput.safeParse({ serviceId: id, pricingType: "FIXED", price: -1 }).success).toBe(false);
    expect(workerServiceInput.safeParse({ serviceId: id, pricingType: "FIXED", price: 0 }).success).toBe(true);
    expect(workerServiceInput.safeParse({ serviceId: id, pricingType: "QUOTE_REQUIRED", price: null }).success).toBe(true);
  });
  it("validates catalog links and category membership", () => {
    expect(catalogInput.safeParse({ kind: "service", name: "Repair", slug: "repair", active: true }).success).toBe(false);
    expect(catalogInput.safeParse({ kind: "category", name: "Repair", slug: "../../admin", active: true }).success).toBe(false);
  });
  it("limits transitions to actions appropriate for the participant and state", () => {
    expect(availableRequestActions("CUSTOMER", "SUBMITTED")).not.toContain("accept");
    expect(availableRequestActions("WORKER", "SENT")).toContain("accept");
    expect(availableRequestActions("WORKER", "COMPLETED")).not.toContain("complete");
    expect(availableRequestActions("CUSTOMER", "COMPLETED")).toContain("dispute");
    expect(availableRequestActions("ADMIN", "IN_PROGRESS")).toEqual([]);
    expect(roleSections.CUSTOMER).not.toContain("finance");
  });
  it("normalizes Hindi service searches and common profession names", () => {
    expect(serviceSearchTerm("इलेक्ट्रीशियन")).toBe("Electrical repair");
    expect(serviceSearchTerm("Plumber")).toBe("Plumbing repair");
    expect(serviceSearchTerm("पानी की टंकी की सफाई")).toBe("Water-tank cleaning");
  });
  it("uses actual coordinates for distances and handles identical points", () => {
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2);
  });
  it("bounds pagination inputs", () => {
    for (const value of ["nan", "Infinity", "-1", "0", "1.5"]) expect(pageNumber(value)).toBe(1);
  });
});
