export function extractTitle(source: string): string | null {
  const first = source
    .replace(/^\uFEFF/, "")
    .split("\n", 1)[0]
    .replace(/\r$/, "");
  const match = /^#\s+(.+?)\s*$/.exec(first);
  return match?.[1] ?? null;
}
