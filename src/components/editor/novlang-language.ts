import { StreamLanguage } from "@codemirror/language";
import type { StringStream } from "@codemirror/language";

const novlangParser = {
  token(stream: StringStream): string | null {
    if (stream.sol() && stream.match(/^\s*#(?:\s|$)/)) return "heading";
    if (stream.sol() && stream.match(/^\s*>\s?/)) return "quote";
    if (stream.sol() && stream.match(/^\s*(?:---+|\*\s*\*\s*\*)\s*$/)) return "meta";
    if (stream.match(/^!\[[^\]]*\]\([^)]*\)/)) return "link";
    if (stream.match(/^\[\^[^\]]+\]/)) return "atom";
    if (stream.match(/^\*\*?/)) return "emphasis";
    if (stream.match(/^`[^`]*`/)) return "monospace";
    stream.next();
    return null;
  },
};

/** Visual-only NovLang highlighting; parsing remains the source of truth. */
export const novlangLanguage = StreamLanguage.define(novlangParser);
export const novlangStreamLanguage = novlangLanguage;

export function diagnosticRange(
  source: string,
  position: { line: number; column: number },
): { from: number; to: number } {
  const lines = source.split("\n");
  const lineIndex = Math.min(Math.max(position.line - 1, 0), Math.max(lines.length - 1, 0));
  const line = lines[lineIndex] ?? "";
  const lineStart = lines.slice(0, lineIndex).reduce((total, item) => total + item.length + 1, 0);
  const prefix = /^(?:# |(?:> ?)|\[\^[^\]]+\]: )/.exec(line)?.[0] ?? "";
  const column = Math.max(position.column - 1, 0);
  const from = Math.min(lineStart + prefix.length + column, lineStart + line.length);
  const remainder = line.slice(prefix.length + column);
  const word = /^\S+/.exec(remainder)?.[0];
  const to = word ? Math.min(from + word.length, lineStart + line.length) : lineStart + line.length;
  return { from, to: Math.max(from, to) };
}
