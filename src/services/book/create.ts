import type { Book } from "@/types/book";
import { canonicalUuid } from "@/utils/uuid";

export interface CreateBookOptions {
  locale: string;
  now: Date | string;
  newUuid?: () => string;
  newChapterId?: () => string;
  /** @deprecated Use separate generators to keep UUID and chapter IDs distinct. */
  newId?: () => string;
}
export function createBook({ locale, now, newUuid, newChapterId, newId }: CreateBookOptions): Book {
  const timestamp = typeof now === "string" ? now : now.toISOString();
  const language = locale || "en";
  const title = language === "ru" ? "Без названия" : language === "zh-CN" ? "未命名" : "Untitled";
  const heading = language === "ru" ? "Глава 1" : language === "zh-CN" ? "第 1 章" : "Chapter 1";
  const uuidGenerator = newUuid ?? newId;
  const chapterGenerator = newChapterId ?? newId;
  if (!uuidGenerator || !chapterGenerator) throw new Error("ID generators are required");
  const bookId = canonicalUuid(uuidGenerator());
  const chapterId = chapterGenerator();
  if (!/^[a-z0-9]{8}$/.test(chapterId)) throw new Error("Invalid chapter ID");
  return {
    metadata: {
      id: bookId,
      title,
      version: null,
      created: timestamp,
      modified: timestamp,
      language,
      authors: [],
      translators: [],
      series: null,
      description: null,
      cover: null,
    },
    chapters: [{ id: chapterId, source: `# ${heading}` }],
    resources: new Map(),
    customCss: null,
  };
}
