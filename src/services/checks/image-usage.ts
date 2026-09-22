import type { Book } from "@/types/book";
import { parse, type BlockNode, type InlineNode } from "novlang-js";

/** Return every NovLang image path and the chapters in which it is referenced. */
export function collectImageUsage(book: Book): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  for (const chapter of book.chapters) {
    const add = (path: string) => {
      const chapters = usage.get(path) ?? [];
      if (!chapters.includes(chapter.id)) chapters.push(chapter.id);
      usage.set(path, chapters);
    };
    const visitInline = (node: InlineNode) => {
      if (node.type === "image") add(node.src);
      else if (node.type === "emphasis" || node.type === "strong")
        node.children.forEach(visitInline);
    };
    const visitBlock = (node: BlockNode) => {
      if (node.type === "heading" || node.type === "paragraph") node.children.forEach(visitInline);
      else if (node.type === "blockquote" || node.type === "footnoteDef")
        node.children.forEach(visitBlock);
    };
    parse(chapter.source).document.children.forEach(visitBlock);
  }
  return usage;
}
