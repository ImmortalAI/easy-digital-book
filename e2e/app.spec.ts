import { expect } from "playwright/test";
import { test } from "./fixtures/platform";

test("new book, save/open, search/replace, undo delete, and export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /new (book|project)/i }).click();

  const editor = page.locator(".cm-content");
  await editor.fill("# Chapter 1\nhero");
  await page.keyboard.press("Control+s");
  await expect(page.locator(".editor-shell__title")).toContainText("book.edb");

  await page.keyboard.press("Control+o");
  await expect(editor).toContainText("hero");

  await page.keyboard.press("Control+Shift+f");
  await page.locator('input[placeholder="Search"]').fill("hero");
  await expect(page.getByText(/1 result/i)).toBeVisible();

  await page.locator("[data-replace-toggle]").click();
  await page.locator('input[placeholder="Replace"]').fill("champion");
  await page.locator("[data-replace-all]").click();
  await expect(editor).toContainText("champion");

  await page.locator('[data-activity="explorer"]').click();
  const chapters = page.locator(".explorer-section").filter({ hasText: "Chapters" });
  await chapters.getByRole("button", { name: "+" }).click();
  await expect(page.locator(".explorer-chapter")).toHaveCount(2);

  await page.locator(".explorer-chapter").nth(1).getByRole("button").nth(2).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("status").filter({ hasText: /chapter deleted/i })).toBeVisible();
  await page
    .getByRole("status")
    .filter({ hasText: /chapter deleted/i })
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(page.locator(".explorer-chapter")).toHaveCount(2);

  await page.locator("[data-export-button]").click();
  await page.locator("[data-export-submit]").click();
  await expect(page.getByRole("status").filter({ hasText: /epub saved/i })).toBeVisible();
});
