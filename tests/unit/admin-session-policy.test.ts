import { describe, expect, it } from "vitest";
import { singleAdminSessionBlocked } from "@/lib/admin-session-policy";

describe("admin session policy", () => {
  it("allows multi-device admin access by default", () => {
    expect(singleAdminSessionBlocked(1)).toBe(false);
    expect(singleAdminSessionBlocked(2)).toBe(false);
  });

  it("only blocks when a single-device policy is explicitly enabled", () => {
    expect(singleAdminSessionBlocked(1, true)).toBe(true);
    expect(singleAdminSessionBlocked(0, true)).toBe(false);
    expect(singleAdminSessionBlocked(3, false)).toBe(false);
  });
});
