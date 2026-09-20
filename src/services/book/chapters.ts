import type { Book, BookMutation, Chapter } from "@/types/book";
const mutation = (
  book: Book,
  changedChapters = new Set<string>(),
  removedChapters = new Set<string>(),
): BookMutation => ({
  book,
  changedChapters,
  removedChapters,
  changedResources: new Set(),
  removedResources: new Set(),
});
export function addChapter(
  book: Book,
  chapter: Chapter,
  index = book.chapters.length,
): BookMutation {
  const chapters = book.chapters.slice();
  chapters.splice(Math.max(0, Math.min(index, chapters.length)), 0, {
    ...chapter,
    source: chapter.source.replace(/\r\n?/g, "\n"),
  });
  return mutation({ ...book, chapters }, new Set([chapter.id]));
}
export function removeChapter(book: Book, chapterId: string): BookMutation {
  const chapters = book.chapters.filter((chapter) => chapter.id !== chapterId);
  return mutation(
    { ...book, chapters },
    new Set(),
    new Set(book.chapters.some((chapter) => chapter.id === chapterId) ? [chapterId] : []),
  );
}
export function moveChapter(book: Book, from: number, to: number): BookMutation {
  const chapters = book.chapters.slice();
  const [chapter] = chapters.splice(from, 1);
  if (!chapter) return mutation(book);
  chapters.splice(Math.max(0, Math.min(to, chapters.length)), 0, chapter);
  return mutation({ ...book, chapters }, new Set([chapter.id]));
}
