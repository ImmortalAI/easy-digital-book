import { describe, expect, it } from "vitest";
import { addChapter, moveChapter } from "@/services/book/chapters";
import { createBook } from "@/services/book/create";
import { normalizeSeriesIndex } from "@/services/book/metadata";
import { customCssTemplate } from "@/assets/epub/custom.css";
import { imageDimensions } from "@/services/book/image-dimensions";

const base = () =>
  createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });

describe("Task 15 fix round domain boundaries", () => {
  it("uses the primary locale subtag for generated chapter headings", () => {
    const mutation = addChapter(base(), { locale: "ru-RU", newId: () => "chapter2" });
    expect(mutation.book.chapters[1]?.source).toBe("# Глава 2");
  });

  it("rejects non-finite series indexes and keeps fractional indexes", () => {
    expect(normalizeSeriesIndex("1.5")).toBe(1.5);
    expect(normalizeSeriesIndex("Infinity")).toBeNull();
    expect(normalizeSeriesIndex("x")).toBeNull();
  });

  it("does not mark an out-of-bounds or no-op move as changed", () => {
    const book = base();
    book.chapters.push({ id: "chapter2", source: "# Two" });
    expect(moveChapter(book, 0, 0).changedChapters).toEqual(new Set());
    expect(moveChapter(book, -1, 1).book).toBe(book);
    expect(moveChapter(book, 2, 0).book).toBe(book);
  });

  it("ships the documented custom CSS starter template", () => {
    expect(customCssTemplate).toContain(".novlang-scene-break");
    expect(customCssTemplate).toContain("footnote");
  });

  it("reads PNG dimensions without relying on DOM image loading", () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(bytes.buffer).setUint32(16, 1600);
    new DataView(bytes.buffer).setUint32(20, 2560);
    expect(imageDimensions(bytes, "image/png")).toEqual({ width: 1600, height: 2560 });
  });
});
