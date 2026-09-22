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
    expect(
      addChapter(base(), { locale: "zh-CN", newId: () => "chapter2" }).book.chapters[1]?.source,
    ).toBe("# 第 2 章");
    expect(
      addChapter(base(), { locale: "zh-Hans-CN", newId: () => "chapter2" }).book.chapters[1]
        ?.source,
    ).toBe("# 第 2 章");
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

  it("reads JPEG SOF and WebP VP8, VP8L and VP8X dimensions", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 10, 0, 20, 1]);
    expect(imageDimensions(jpeg, "image/jpeg")).toEqual({ width: 20, height: 10 });
    const vp8x = new Uint8Array(30);
    vp8x.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]);
    vp8x.set([1, 0, 0, 2, 0, 0], 24);
    expect(imageDimensions(vp8x, "image/webp")).toEqual({ width: 2, height: 3 });
    const vp8 = new Uint8Array(42);
    vp8.set(vp8x.subarray(0, 12));
    vp8.set([0x56, 0x50, 0x38, 0x20], 12);
    vp8.set([0x9d, 1, 0x2a, 20, 0, 10, 0], 23);
    expect(imageDimensions(vp8, "image/webp")).toEqual({ width: 20, height: 10 });
    const vp8l = new Uint8Array(42);
    vp8l.set(vp8x.subarray(0, 12));
    vp8l.set([0x56, 0x50, 0x38, 0x4c], 12);
    vp8l[20] = 0x2f;
    vp8l[21] = 4;
    vp8l[23] = 128;
    expect(imageDimensions(vp8l, "image/webp")).toEqual({ width: 5, height: 3 });
  });
});
