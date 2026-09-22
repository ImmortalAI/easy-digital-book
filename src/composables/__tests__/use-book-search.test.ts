import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { useBookSearch } from "@/composables/use-book-search";
import { useNotificationsStore } from "@/stores/notifications";
import { useProjectStore } from "@/stores/project";

function makeBook() {
  const book = createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });
  book.chapters.push({ id: "chapter2", source: "hero hero" });
  book.chapters[0]!.source = "hero one";
  return book;
}

describe("useBookSearch", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("disables only stale chapter undo after a later edit", () => {
    const project = useProjectStore();
    const value = makeBook();
    value.chapters[1]!.source = "other";
    project.setBook(value);
    const search = useBookSearch();

    search.replaceAll({ text: "hero", caseSensitive: true, wholeWord: false, regex: false }, "x");
    const notification = useNotificationsStore().items[0]!;
    project.updateChapterSource("chapter1", "later edit");

    // The item exposes its state as a live value, not a snapshot.
    expect(notification.undoState?.()).toBe(false);
    expect(notification.undoEnabled).toBe(false);
    expect(project.book?.chapters[1]?.source).toBe("other");
  });

  it("restores a deleted chapter at its original position", () => {
    const project = useProjectStore();
    project.setBook(makeBook());
    const search = useBookSearch();
    const removed = project.book!.chapters[0]!;

    search.deleteChapter(removed.id);
    const notification = useNotificationsStore().items[0]!;
    notification.undo?.();

    expect(project.book?.chapters.map((chapter) => chapter.id)).toEqual(["chapter1", "chapter2"]);
  });
});
