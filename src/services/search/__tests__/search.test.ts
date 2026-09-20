import { describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { findInBook } from "@/services/search/find";
import { replaceMatches } from "@/services/search/replace";
import type { SearchQuery } from "@/services/search/query";

function book() {
  const value = createBook({
    locale: "ru",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });
  return { ...value, chapters: [{ id: "chapter1", source: "герой геройский\nглава 12" }] };
}

describe("book search", () => {
  it("matches Cyrillic whole words without matching a word prefix", () => {
    expect(
      findInBook(book(), { text: "герой", wholeWord: true, caseSensitive: false, regex: false }),
    ).toHaveLength(1);
  });

  it("finds regex captures and previews replacement text", () => {
    const query: SearchQuery = {
      text: "(глава) (\\d+)",
      wholeWord: false,
      caseSensitive: false,
      regex: true,
    };
    const result = replaceMatches(book(), query, "$2. $1");
    if ("error" in result) throw new Error(result.error);
    expect(result.changes[0]?.source).toContain("12. глава");
    expect(result.changes[0]?.matches[0]?.replacementPreview).toBe("12. глава");
  });

  it("returns an error instead of throwing for invalid regex", () => {
    expect(() =>
      replaceMatches(
        book(),
        { text: "[", regex: true, wholeWord: false, caseSensitive: false },
        "x",
      ),
    ).not.toThrow();
    expect(
      replaceMatches(
        book(),
        { text: "[", regex: true, wholeWord: false, caseSensitive: false },
        "x",
      ),
    ).toEqual({ error: "search.invalidRegex" });
  });
});
