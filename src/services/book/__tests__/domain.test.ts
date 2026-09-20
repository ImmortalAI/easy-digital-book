import { describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { extractTitle } from "@/services/book/extract-title";
import { importImage } from "@/services/book/resources";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("book domain", () => {
  it("creates a localized new book with an injected clock and id", () => {
    const book = createBook({
      locale: "ru",
      now: new Date("2026-01-02T03:04:05.000Z"),
      newId: () => "abc12345",
    });
    expect(book.metadata.title).toBe("Без названия");
    expect(book.metadata.language).toBe("ru");
    expect(book.metadata.created).toBe("2026-01-02T03:04:05.000Z");
    expect(book.chapters).toEqual([{ id: "abc12345", source: "# Глава 1" }]);
  });

  it("extracts a title only from a first-line NovLang heading", () => {
    expect(extractTitle("# My Chapter\ntext")).toBe("My Chapter");
    expect(extractTitle("text\n# Not a title")).toBeNull();
  });

  it("reuses a resource when its SHA-256 matches", async () => {
    const book = createBook({ locale: "en", now: new Date("2026-01-02"), newId: () => "chapter1" });
    const first = await importImage(book, "cover.png", png, { sha256: async () => "hash" });
    const result = await importImage(first.book, "other name.png", png, {
      sha256: async () => "hash",
    });
    expect(result.path).toBe("images/cover.png");
    expect(result.inserted).toBe(false);
    expect(result.book).toBe(first.book);
  });
});
