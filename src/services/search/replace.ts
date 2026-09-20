import type { Book } from "@/types/book";
import {
  advanceStringIndex,
  compileQuery,
  type SearchError,
  type SearchQuery,
  type SearchResult,
} from "./query";

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
        replacementPreview: expandReplacement(replacement, match, chapter.source),
      });
      if (match[0].length === 0)
        expression.lastIndex = advanceStringIndex(chapter.source, expression.lastIndex);
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

function expandReplacement(replacement: string, match: RegExpExecArray, source: string): string {
  return replacement.replace(/\$([$&`']|<[^>]*>|\d{1,2})/g, (token, key: string) => {
    if (key === "$") return "$";
    if (key === "&") return match[0];
    if (key === "`") return source.slice(0, match.index);
    if (key === "'") return source.slice(match.index + match[0].length);
    if (key.startsWith("<")) {
      if (!match.groups) return token;
      return match.groups[key.slice(1, -1)] ?? "";
    }
    const group = Number(key);
    if (group > 0 && group < match.length) return match[group] ?? "";
    if (key.length === 2 && Number(key[0]) > 0 && Number(key[0]) < match.length)
      return `${match[Number(key[0])] ?? ""}${key[1]}`;
    return token;
  });
}
