import { describe, expect, it } from "vitest";
import { portalText, translateText } from "@/lib/portal-i18n";

describe("portal language coverage", () => {
  it("translates service names, statuses, catalog descriptions, and counts", () => {
    for (const value of ["Electrical repair", "Plumbing repair", "Water-tank cleaning", "IN_PROGRESS", "NOT_SUBMITTED", "PLATFORM_FEE", "USER_STATUS_CHANGED", "Home repairs services from local professionals.", "Electrical repair from verified SevaSetu professionals.", "Set busy", "3 available now", "12h", "2 km coverage", "Electrical repair, Plumbing repair"]) {
      expect(translateText("hi", value), value).not.toMatch(/[A-Za-z]/);
    }
  });

  it("translates complete feedback and notification templates with their service and status", () => {
    expect(translateText("hi", "Electrical repair is now in progress.")).toBe("बिजली की मरम्मत की नई स्थिति: कार्य जारी है।");
    expect(translateText("hi", "Sent to 15 accounts")).toBe("15 खातों को भेजा गया");
    expect(translateText("hi", "Please fill in what service you need and your location before searching.")).not.toMatch(/[A-Za-z]/);
    expect(translateText("hi", "Pinned location (13.0827, 80.2707)")).toBe("चुना गया स्थान (13.0827, 80.2707)");
  });

  it("switches existing messages back to English", () => {
    expect(translateText("en", translateText("hi", "Sent to 15 accounts"))).toBe("Sent to 15 accounts");
    expect(translateText("en", portalText("hi", "goodMorning", { name: "Asha Verma" }))).toBe("Good Morning, Asha Verma!");
  });

  it("preserves branding, copyright, and unknown user content", () => {
    for (const value of ["Seva", "Setu", "SevaSetu", "Har Seva, Ek Setu.", "© 2026 SevaSetu. All rights reserved.", "Asha Verma", "asha@example.com", "Please repair the red gate at my house."]) {
      expect(translateText("hi", value)).toBe(value);
      expect(translateText("en", value)).toBe(value);
    }
    expect(translateText("hi", "Good Morning, Admin!")).toBe("सुप्रभात, Admin!");
  });

  it("translates API errors and form hints", () => {
    for (const value of ["Invalid email or password", "That verification code is invalid or expired.", "Too many sign-in attempts. Try again later.", "Unable to update request.", "Choose a JPG, PNG, WebP, or PDF file up to 10 MB.", "Home, shop, or office"]) {
      expect(translateText("hi", value), value).not.toMatch(/[A-Za-z]/);
    }
  });
});
