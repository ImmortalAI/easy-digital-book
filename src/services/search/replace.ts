import type { Book } from "@/types/book";
import { compileQuery, type SearchError, type SearchQuery, type SearchResult } from "./query";

export interface ReplacementChange {
  chapterId: string;
  source: string;
  matches: SearchResult[];
}

export interface ReplacementPlan {
  changes: ReplacementChange[];
}

export type ReplacementResult = ReplacementPlan | SearchError;

export function replaceMatches(
  book: Book,
  query: SearchQuery,
  replacement: string,
): ReplacementResult {
  const expression = compileQuery(query);
  if ("error" in expression) return expression;
  const previewExpression = new RegExp(expression.source, expression.flags.replace("g", ""));
  const changes: ReplacementChange[] = [];
  for (const chapter of book.chapters) {
    expression.lastIndex = 0;
    const matches: SearchResult[] = [];
    let match: RegExpExecArray | null;
    while ((match = expression.exec(chapter.source))) {
      matches.push({
        chapterId: chapter.id,
        from: match.index,
        to: match.index + match[0].length,
        matched: match[0],
        replacementPreview: match[0].replace(previewExpression, replacement),
      });
      if (match[0].length === 0) expression.lastIndex++;
    }
    if (matches.length) {
      expression.lastIndex = 0;
      changes.push({
        chapterId: chapter.id,
        source: chapter.source.replace(expression, replacement),
        matches,
      });
    }
  }
  return { changes };
}
