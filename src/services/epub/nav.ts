import type { RenderedChapter } from "./chapter";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c,
  );
export function navXhtml(chapters: RenderedChapter[], titlePage: boolean, title: string): string {
  const entries = chapters
    .map((c, i) => `<li><a href="chapter-${i + 1}.xhtml">${esc(c.title)}</a></li>`)
    .join("");
  const first = titlePage ? `<li><a href="title.xhtml">${esc(title)}</a></li>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${esc(title)}</title></head><body><nav epub:type="toc" id="toc"><h1>${esc(title)}</h1><ol>${first}${entries}</ol></nav><nav epub:type="landmarks"><ol>${titlePage ? '<li><a epub:type="titlepage" href="title.xhtml">Title page</a></li>' : ""}<li><a epub:type="bodymatter" href="chapter-1.xhtml">Start</a></li></ol></nav></body></html>`;
}
