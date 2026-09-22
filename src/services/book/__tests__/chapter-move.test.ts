import { describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { moveChapter } from "@/services/book/chapters";

describe("chapter movement", () => {
  it("moves a chapter and marks the moved chapter changed", () => {
    const book = createBook({
      locale: "en",
      now: new Date("2026-01-01"),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "abcdef01",
    });
    book.chapters.push({ id: "abcdef02", source: "# Two" }, { id: "abcdef03", source: "# Three" });
    const mutation = moveChapter(book, 0, 2);
    expect(mutation.book.chapters.map((chapter) => chapter.id)).toEqual([
      "abcdef02",
      "abcdef03",
      "abcdef01",
    ]);
    expect(mutation.changedChapters).toEqual(new Set(["abcdef01"]));
  });
});
