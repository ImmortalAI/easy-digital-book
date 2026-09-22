import { expect } from "playwright/test";
import { test } from "./fixtures/platform";

test("new book, save/open, search/replace, undo delete, and export", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-action="new-project"]').click();

  const editor = page.locator(".cm-content");
  await editor.fill("# Chapter 1\nhero");
  await page.keyboard.press("Control+s");
  await expect(page.locator("[data-editor-title]")).toContainText("book.edb");

  await page.keyboard.press("Control+o");
  await expect(editor).toContainText("hero");

  await page.keyboard.press("Control+Shift+f");
  await page.locator("[data-search-input]").fill("hero");
  await expect(page.locator("[data-search-group]")).toHaveCount(1);
  await expect(page.locator("[data-search-count]")).toHaveText("1");

  await page.locator("[data-replace-toggle]").click();
  await page.locator("[data-replace-input]").fill("champion");
  await page.locator("[data-replace-all]").click();
  await expect(editor).toContainText("champion");

  await page.locator('[data-activity="explorer"]').click();
  await page.locator('[data-explorer-section="chapters"] [data-chapter-add]').click();
  await expect(page.locator("[data-explorer-chapter]")).toHaveCount(2);

  await page.locator("[data-explorer-chapter]").nth(1).locator("[data-chapter-delete]").click();
  await page.locator("[data-confirm-delete]").click();
  await expect(page.locator("[data-toast]")).toBeVisible();
  await page.locator("[data-toast] [data-undo]").click();
  await expect(page.locator("[data-explorer-chapter]")).toHaveCount(2);

  await page.locator("[data-export-button]").click();
  await page.locator("[data-export-submit]").click();
  await expect(page.getByRole("status").filter({ hasText: /epub saved/i })).toBeVisible();
});
