import { describe, expect, it } from "vitest";
import { messageInput, reportInput, serviceRequestInput } from "@/lib/api-contracts";
import { createObjectKey } from "@/lib/storage";

describe("security contracts", () => {
  it("rejects short or oversized service requests", () => {
    expect(serviceRequestInput.safeParse({ serviceId: "not-a-uuid", description: "short" }).success).toBe(false);
    expect(serviceRequestInput.safeParse({ serviceId: "00000000-0000-0000-0000-000000000000", description: "a".repeat(10_001) }).success).toBe(false);
  });
  it("rejects empty messages and invalid report targets", () => {
    expect(messageInput.safeParse({ conversationId: "00000000-0000-0000-0000-000000000000", body: "" }).success).toBe(false);
    expect(reportInput.safeParse({ reportedUserId: "not-a-uuid", category: "x", description: "short" }).success).toBe(false);
  });
  it("keeps object keys scoped to the authenticated user", () => {
    expect(createObjectKey("user-1", "proof.pdf")).toMatch(/^uploads\/user-1\/[a-f0-9-]+\.pdf$/);
  });
});
