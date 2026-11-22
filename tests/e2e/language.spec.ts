import { expect, test } from "@playwright/test";

// These flows visit several routes, including their first development compilation.
test.setTimeout(90000);

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ status: 401, json: { error: "Authentication required" } }));
  await page.route("**/api/v1/workers?**", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/v1/marketplace-summary", (route) => route.fulfill({ json: { data: { workers: 0, completedJobs: 0, rating: null, ratingCount: 0, categories: [] } } }));
});

test("Hindi and English persist across public pages while branding remains English", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language" }).selectOption("hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("अच्छा काम आपकी सोच से भी करीब है।");
  await expect(page.locator(".footer-copyright")).toHaveText("© 2026 SevaSetu. All rights reserved.");
  await expect(page.locator(".sevasetu-logo-copy").first()).toHaveText("SevaSetuHar Seva, Ek Setu.");
  await page.getByRole("button", { name: "खोजें", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).not.toContainText(/[A-Za-z]/);

  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("आइए काम पूरा करें।");
  await page.route("**/api/v1/auth/login", (route) => route.fulfill({ status: 401, json: { error: "Invalid email or password" } }));
  await page.getByLabel("ईमेल पता").fill("test@example.com");
  await page.getByLabel("पासवर्ड", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "लॉग इन", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("ईमेल या पासवर्ड गलत है");
  await page.getByRole("combobox", { name: "भाषा" }).selectOption("en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Let's get things done.");
  await expect(page.locator("main").getByRole("alert")).toHaveText("Invalid email or password");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Let's get things done.");
});

test("Hindi applies to recovery, verification, and policy pages", async ({ page, context }) => {
  await context.addCookies([{ name: "sevasetu-language", value: "hi", url: test.info().project.use.baseURL! }]);
  for (const url of ["/forgot-password", "/reset-password?token=test", "/verify-email", "/privacy", "/terms", "/unauthorized"]) {
    await page.goto(url);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(/[A-Za-z]/);
    const text = (await page.locator("main").innerText()).replace(/SevaSetu|Har Seva, Ek Setu\.|English/gi, "");
    expect(text, url).not.toMatch(/[A-Za-z]/);
  }
});
