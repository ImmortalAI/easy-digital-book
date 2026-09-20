import type { Book, BookMetadata, BookMutation } from "@/types/book";
const empty = (book: Book): BookMutation => ({
  book,
  changedChapters: new Set(),
  removedChapters: new Set(),
  changedResources: new Set(),
  removedResources: new Set(),
});
export function updateMetadata(book: Book, patch: Partial<BookMetadata>): BookMutation {
  return empty({ ...book, metadata: { ...book.metadata, ...patch } });
}
export function setCover(book: Book, cover: string | null): BookMutation {
  return updateMetadata(book, { cover });
}
export function setCustomCss(book: Book, customCss: string | null): BookMutation {
  return empty({ ...book, customCss });
}
