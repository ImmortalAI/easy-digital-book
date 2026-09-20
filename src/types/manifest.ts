import type { BookMetadata, Chapter } from "./book";
export interface Manifest {
  format: "easy-digital-book";
  formatVersion: number;
  book: BookMetadata;
  chapters: Array<Pick<Chapter, "id">>;
}
