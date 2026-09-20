import { describe, expect, it } from "vitest";
import { renderChapter } from "@/services/epub/chapter";
import type { Book } from "@/types/book";

const book: Book = {
  metadata: {
    id: "urn:uuid:test",
    title: "Book",
    version: null,
    created: "",
    modified: "",
    language: "ru",
    authors: [],
    translators: [],
    series: null,
    description: null,
    cover: null,
  },
  chapters: [],
  resources: new Map(),
  customCss: null,
};

describe("renderChapter", () => {
  it("wraps rendered NovLang in valid EPUB XHTML", () => {
    const result = renderChapter(
      { id: "abc12345", source: "# Глава\n\nТекст ![рисунок](images/a.png)" },
      0,
      book,
      new Map([["images/a.png", "images/a.jpg"]]),
    );
    expect(result.xhtml).toContain('xmlns:epub="http://www.idpf.org/2007/ops"');
    expect(result.xhtml).toContain('src="images/a.jpg"');
    expect(result.title).toBe("Глава");
    expect(result.referencedPaths).toEqual(["images/a.png"]);
  });

  it("removes image nodes without a mapped resource instead of emitting broken links", () => {
    const result = renderChapter(
      { id: "abc12345", source: "Текст ![](images/missing.png) и ![](images/a.png)" },
      2,
      book,
      new Map([["images/a.png", "images/a.png"]]),
    );
    expect(result.xhtml).not.toContain("missing.png");
    expect(result.referencedPaths).toEqual(["images/a.png"]);
  });

  it("uses a localized fallback title when a chapter has no heading", () => {
    const result = renderChapter({ id: "abc12345", source: "Текст" }, 1, book, new Map());
    expect(result.title).toBe("Глава 2");
    expect(result.xhtml).toContain("<title>Глава 2</title>");
  });
});
