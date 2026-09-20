import type { Book } from "@/types/book";
import type { RenderedChapter } from "./chapter";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c,
  );
export function opf(
  book: Book,
  chapters: RenderedChapter[],
  resources: Array<{ path: string; mediaType: string; id: string }>,
  includeTitle: boolean,
  exported: Date,
): string {
  const m = book.metadata;
  const creators = m.authors.map((a) => `<dc:creator>${esc(a)}</dc:creator>`).join("");
  const contributors = m.translators
    .map(
      (a) =>
        `<dc:contributor id="translator-${m.translators.indexOf(a)}"><meta property="role" refines="#translator-${m.translators.indexOf(a)}" scheme="marc:relators">trl</meta>${esc(a)}</dc:contributor>`,
    )
    .join("");
  const series = m.series
    ? `<meta name="calibre:series" content="${esc(m.series.name)}"/><meta name="calibre:series_index" content="${m.series.index}"/>`
    : "";
  const cover = m.cover ? `<meta name="cover" content="cover-image"/>` : "";
  const manifest = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    includeTitle
      ? `<item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>`
      : "",
    `<item id="theme" href="theme.css" media-type="text/css"/>`,
    `<item id="custom" href="custom.css" media-type="text/css"/>`,
    ...chapters.map(
      (_, i) =>
        `<item id="chapter-${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`,
    ),
    ...resources.map(
      (r) =>
        `<item id="${r.id}" href="${esc(r.path)}" media-type="${r.mediaType}"${m.cover === r.path.replace(/^OEBPS\//, "") ? ' properties="cover-image"' : ""}/>`,
    ),
  ]
    .filter(Boolean)
    .join("");
  const spine = `${includeTitle ? '<itemref idref="title-page"/>' : ""}${chapters.map((_, i) => `<itemref idref="chapter-${i + 1}"/>`).join("")}`;
  return `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${esc(m.id)}</dc:identifier><dc:title>${esc(m.title)}</dc:title>${creators}${contributors}<dc:language>${esc(m.language)}</dc:language>${m.description ? `<dc:description>${esc(m.description)}</dc:description>` : ""}<meta property="dcterms:modified">${exported.toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>${series}${cover}</metadata><manifest>${manifest}</manifest><spine toc="ncx">${spine}</spine></package>`;
}
