import en from "@/locales/en.json";
import ru from "@/locales/ru.json";
import zhCN from "@/locales/zh-CN.json";
import { expect, it } from "vitest";

function keys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === "object"
      ? keys(child as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

it("keeps every locale key aligned with English", () => {
  expect(keys(ru).sort()).toEqual(keys(en).sort());
  expect(keys(zhCN).sort()).toEqual(keys(en).sort());
});

it("contains the localized keys required by the final editor shell", () => {
  expect(keys(en)).toEqual(
    expect.arrayContaining([
      "breadcrumbs.metadata",
      "breadcrumbs.settings",
      "breadcrumbs.chapters",
      "breadcrumbs.fallback",
      "editor.unnamedBook",
      "editor.selectChapter",
      "editor.chooseChapter",
      "editor.status",
      "warnings.currentChapter",
      "warnings.book",
      "warnings.none",
      "files.openTitle",
      "files.saveTitle",
      "files.importImage",
      "files.fileNotFound",
      "files.openFailed",
      "files.recoverTitle",
      "files.recoverMessage",
      "files.saveFailed",
    ]),
  );
});
