import type { AppWarning } from "@/types/diagnostics";
import type { Book } from "@/types/book";
import { extractTitle } from "@/services/book/extract-title";
import { collectImageUsage } from "./image-usage";

export function checkBook(book: Book): AppWarning[] {
  const warnings: AppWarning[] = [];
  if (!book.metadata.title.trim())
    warnings.push({ code: "book.blankTitle", message: "Book title is blank" });
  if (!book.metadata.cover)
    warnings.push({ code: "book.missingCover", message: "Book has no cover" });
  for (const chapter of book.chapters)
    if (!extractTitle(chapter.source))
      warnings.push({
        code: "book.missingTitle",
        message: "Chapter has no title",
        chapterId: chapter.id,
      });

  const usage = collectImageUsage(book);
  for (const [path, chapterIds] of usage) {
    if (!book.resources.has(path))
      for (const chapterId of chapterIds)
        warnings.push({
          code: "book.missingImage",
          message: `Image is missing: ${path}`,
          chapterId,
        });
  }
  for (const path of book.resources.keys())
    if (!usage.has(path))
      warnings.push({ code: "book.unusedImage", message: `Image is unused: ${path}` });
  return warnings;
}
