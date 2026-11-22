import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ status: 401, json: { error: "Authentication required" } }));
  await page.route("**/api/v1/marketplace-summary", (route) => route.fulfill({ json: { data: { workers: 0, completedJobs: 0, rating: null, ratingCount: 0, categories: [] } } }));
});

test("public entry points are available", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SevaSetu/i);
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /everyday work easier/i })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /get things done/i })).toBeVisible();
});

test("mobile navigation does not overflow the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
