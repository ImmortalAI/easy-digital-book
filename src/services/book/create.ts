import type { Book } from "@/types/book";

export interface CreateBookOptions {
  locale: string;
  now: Date | string;
  newId: () => string;
}
export function createBook({ locale, now, newId }: CreateBookOptions): Book {
  const timestamp = typeof now === "string" ? now : now.toISOString();
  const language = locale || "en";
  const title = language === "ru" ? "Без названия" : language === "zh-CN" ? "未命名" : "Untitled";
  const heading = language === "ru" ? "Глава 1" : language === "zh-CN" ? "第 1 章" : "Chapter 1";
  return {
    metadata: {
      id: `urn:uuid:${newId()}`,
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
    chapters: [{ id: newId(), source: `# ${heading}` }],
    resources: new Map(),
    customCss: null,
  };
}
