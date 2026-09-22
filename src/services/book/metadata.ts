import type { Book, BookMetadata, BookMutation } from "@/types/book";
const empty = (book: Book): BookMutation => ({
  book,
  changedChapters: new Set(),
  removedChapters: new Set(),
  changedResources: new Set(),
  removedResources: new Set(),
});
export function updateMetadata(book: Book, patch: Partial<BookMetadata>): BookMutation {
  const mutation = empty({ ...book, metadata: { ...book.metadata, ...patch } });
  if (Object.prototype.hasOwnProperty.call(patch, "cover")) mutation.metadataCoverChanged = true;
  return mutation;
}
export function setCover(book: Book, cover: string | null): BookMutation {
  return updateMetadata(book, { cover });
}
export function setCustomCss(book: Book, customCss: string | null): BookMutation {
  return empty({ ...book, customCss });
}

export function normalizeSeriesIndex(value: string): number | null {
  const index = Number(value);
  return Number.isFinite(index) ? index : null;
}
