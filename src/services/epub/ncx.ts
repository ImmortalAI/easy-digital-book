import type { RenderedChapter } from "./chapter";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c,
  );
export function ncx(chapters: RenderedChapter[], uid: string, title: string): string {
  const points = chapters
    .map(
      (c, i) =>
        `<navPoint id="navPoint-${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(c.title)}</text></navLabel><content src="chapter-${i + 1}.xhtml"/></navPoint>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${esc(uid)}"/></head><docTitle><text>${esc(title)}</text></docTitle><navMap>${points}</navMap></ncx>`;
}
