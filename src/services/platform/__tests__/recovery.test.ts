import { describe, expect, it } from "vitest";
import { createRecoveryStore } from "../recovery";
import type { Book } from "@/types/book";

const book = (): Book => ({
  metadata: {
    id: "book",
    title: "Book",
    version: null,
    created: "",
    modified: "",
    language: "en",
    authors: [],
    translators: [],
    series: null,
    description: null,
    cover: null,
  },
  chapters: [
    { id: "one", source: "changed" },
    { id: "two", source: "unchanged" },
  ],
  resources: new Map([["images/a.png", { bytes: new Uint8Array([1]), mediaType: "image/png" }]]),
  customCss: "body {}",
});

describe("indexeddb recovery", () => {
  it("writes only changed chapters and preserves unchanged rows", async () => {
    const recovery = createRecoveryStore();
    await recovery.writeChanges(book(), {
      changedChapters: new Set(["one", "two"]),
      removedChapters: new Set(),
      changedResources: new Set(),
      removedResources: new Set(),
    });
    const next = book();
    next.chapters[0].source = "new";
    await recovery.writeChanges(next, {
      changedChapters: new Set(["one"]),
      removedChapters: new Set(),
      changedResources: new Set(),
      removedResources: new Set(),
    });
    expect(
      (await recovery.restore("book"))?.chapters.find((chapter) => chapter.id === "two")?.source,
    ).toBe("unchanged");
    expect(
      (await recovery.restore("book"))?.chapters.find((chapter) => chapter.id === "one")?.source,
    ).toBe("new");
  });

  it("deletes a corrupt session instead of throwing", async () => {
    const recovery = createRecoveryStore();
    await expect(recovery.restore("corrupt")).resolves.toBeNull();
  });
});
