import type { Book } from "@/types/book";

const IMAGE_REFERENCE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** Return every NovLang image path and the chapters in which it is referenced. */
export function collectImageUsage(book: Book): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  for (const chapter of book.chapters) {
    IMAGE_REFERENCE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMAGE_REFERENCE.exec(chapter.source))) {
      const path = match[1];
      if (!path) continue;
      const chapters = usage.get(path) ?? [];
      if (!chapters.includes(chapter.id)) chapters.push(chapter.id);
      usage.set(path, chapters);
    }
  }
  return usage;
}
