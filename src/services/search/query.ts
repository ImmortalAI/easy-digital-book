export interface SearchQuery {
  text: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface SearchError {
  error: "search.invalidRegex";
}

export interface SearchResult {
  chapterId: string;
  from: number;
  to: number;
  matched: string;
  replacementPreview?: string;
}

/** Compile a query without leaking RegExp construction errors to callers. */
export function compileQuery(query: SearchQuery): RegExp | SearchError {
  if (!query.text) return new RegExp("(?!)", "gu");
  let source = query.regex ? query.text : escapeRegExp(query.text);
  if (query.wholeWord) source = `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`;
  try {
    return new RegExp(source, `${query.caseSensitive ? "" : "i"}gu`);
  } catch {
    return { error: "search.invalidRegex" };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
