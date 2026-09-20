import type { Book, BookMutation } from "@/types/book";
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
export interface AddChapterOptions {
  locale?: string;
  newId: () => string;
}
export function addChapter(
  book: Book,
  options: AddChapterOptions,
  index = book.chapters.length,
): BookMutation {
  const chapterId = options.newId();
  if (!/^[a-z0-9]{8}$/.test(chapterId) || book.chapters.some((chapter) => chapter.id === chapterId))
    throw new Error("Invalid or colliding chapter ID");
  const locale = options.locale ?? book.metadata.language;
  const number = book.chapters.length + 1;
  const heading =
    locale === "ru"
      ? `Глава ${number}`
      : locale === "zh-CN"
        ? `第 ${number} 章`
        : `Chapter ${number}`;
  const chapters = book.chapters.slice();
  chapters.splice(Math.max(0, Math.min(index, chapters.length)), 0, {
    id: chapterId,
    source: `# ${heading}`,
  });
  return mutation({ ...book, chapters }, new Set([chapterId]));
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
