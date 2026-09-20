import { test } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

for (const path of ["/", "/login", "/register", "/privacy", "/terms"]) {
  test(`public page ${path} has no critical accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await injectAxe(page);
    await checkA11y(page, undefined, { includedImpacts: ["critical", "serious"] });
  });
}
