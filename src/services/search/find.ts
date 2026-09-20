import type { Book } from "@/types/book";
import {
  advanceStringIndex,
  compileQuery,
  type SearchError,
  type SearchQuery,
  type SearchResult,
} from "./query";

export function findInBook(book: Book, query: SearchQuery): SearchResult[] | SearchError {
  const expression = compileQuery(query);
  if ("error" in expression) return expression;
  const results: SearchResult[] = [];
  for (const chapter of book.chapters) {
    expression.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = expression.exec(chapter.source))) {
      results.push({
        chapterId: chapter.id,
        from: match.index,
        to: match.index + match[0].length,
        matched: match[0],
      });
      if (match[0].length === 0)
        expression.lastIndex = advanceStringIndex(chapter.source, expression.lastIndex);
    }
  }
  return results;
}
