import { describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { checkBook } from "@/services/checks/book-checks";
import { collectImageUsage } from "@/services/checks/image-usage";

function book() {
  const value = createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });
  return {
    ...value,
    metadata: { ...value.metadata, title: "", cover: "images/missing.png" },
    chapters: [{ id: "chapter1", source: "#\n![](images/missing.png)\n![](images/unused.png)" }],
    resources: new Map([
      ["images/unused.png", { bytes: new Uint8Array([1]), mediaType: "image/png" as const }],
      ["images/extra.png", { bytes: new Uint8Array([2]), mediaType: "image/png" as const }],
    ]),
  };
}

describe("book checks", () => {
  it("collects all image references and their chapter IDs", () => {
    expect(collectImageUsage(book())).toEqual(
      new Map([
        ["images/missing.png", ["chapter1"]],
        ["images/unused.png", ["chapter1"]],
      ]),
    );
  });

  it("reports blank title, missing title, missing image, and unused image", () => {
    const warnings = checkBook(book());
    expect(warnings.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "book.blankTitle",
        "book.missingTitle",
        "book.missingImage",
        "book.unusedImage",
      ]),
    );
    expect(warnings.find(({ code }) => code === "book.missingImage")?.chapterId).toBe("chapter1");
  });

  it("uses NovLang image nodes, ignoring escaped syntax and accepting nested parentheses", () => {
    const value = {
      ...book(),
      chapters: [{ id: "chapter1", source: "![](images/a(b).png)\n\\![](images/escaped.png)" }],
    };
    expect(collectImageUsage(value)).toEqual(new Map([["images/a(b).png", ["chapter1"]]]));
  });
});
