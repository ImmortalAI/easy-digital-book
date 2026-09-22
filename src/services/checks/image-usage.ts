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

/** Matches the `url(...)` scan buildEpub performs over custom CSS. */
const CSS_URL = /url\(["']?([^"')]+)["']?\)/g;

/**
 * Every resource the book actually needs: chapter references plus the cover and
 * anything custom CSS points at. buildEpub packs exactly this set, so anything
 * outside it — and only that — is safe to report as unused or to delete.
 */
export function collectUsedImagePaths(book: Book): Set<string> {
  const used = new Set<string>();
  for (const path of collectImageUsage(book).keys()) if (book.resources.has(path)) used.add(path);
  if (book.metadata.cover && book.resources.has(book.metadata.cover)) used.add(book.metadata.cover);
  for (const match of book.customCss?.matchAll(CSS_URL) ?? []) {
    const path = match[1].trim();
    if (book.resources.has(path)) used.add(path);
  }
  return used;
}
