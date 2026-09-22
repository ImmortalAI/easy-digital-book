import { expect } from "playwright/test";
import { test } from "./fixtures/platform";

test("switching the interface language does not raise an error", async ({ page }) => {
  const crashes: string[] = [];
  page.on("pageerror", (error) => crashes.push(String(error)));

  await page.goto("/");
  await page.locator('[data-action="new-project"]').click();
  await page.locator('[data-activity="settings"]').click();
  await page.locator(".settings-view").waitFor();

  await page.locator('[data-setting="locale"] select').selectOption("ru");
  await expect(page.locator("#settings-title")).toHaveText("Настройки");

  await page.locator('[data-setting="locale"] select').selectOption("zh-CN");
  await expect(page.locator("#settings-title")).toHaveText("设置");

  // The crash dialog is what the user actually saw.
  await expect(page.locator("[data-error-details]")).toHaveCount(0);
  expect(crashes).toEqual([]);
});
