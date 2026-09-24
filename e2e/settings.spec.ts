import { expect } from "playwright/test";
import { test } from "./fixtures/platform";

test("switching the interface language does not raise an error", async ({ page }) => {
  const crashes: string[] = [];
  page.on("pageerror", (error) => crashes.push(String(error)));

  await page.goto("/");
  await page.locator('[data-action="new-project"]').click();
  await page.locator('[data-activity="settings"]').click();
  await page.locator("[data-settings-view]").waitFor();

  await page.getByRole("combobox", { name: /interface language/i }).click();
  await page.getByRole("option", { name: "Русский" }).click();
  await expect(page.locator("#settings-title")).toHaveText("Настройки");

  await page.getByRole("combobox", { name: /язык интерфейса/i }).click();
  await page.getByRole("option", { name: "简体中文" }).click();
  await expect(page.locator("#settings-title")).toHaveText("设置");

  // The crash dialog is what the user actually saw.
  await expect(page.locator("[data-error-details]")).toHaveCount(0);
  expect(crashes).toEqual([]);
});

test("the theme switcher darkens the window", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-action="new-project"]').click();
  await page.locator('[data-activity="settings"]').click();

  await page.getByRole("combobox", { name: /theme/i }).click();
  await page.getByRole("option", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.getByRole("combobox", { name: /theme/i }).click();
  await page.getByRole("option", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});
