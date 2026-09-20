import { getLabels } from "./labels";
import type { Book } from "@/types/book";

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c,
  );
export function titlePage(
  book: Book,
  includeCustomCss = Boolean(book.customCss),
  versionInTitle = false,
): string {
  const m = book.metadata;
  const labels = getLabels(m.language);
  const displayTitle = versionInTitle && m.version ? `${m.title} (${m.version})` : m.title;
  const lines = [`<h1>${esc(displayTitle)}</h1>`];
  if (m.authors.length) lines.push(`<p>${m.authors.map(esc).join(", ")}</p>`);
  if (m.translators.length)
    lines.push(
      `<p><strong>${labels.translation}:</strong> ${m.translators.map(esc).join(", ")}</p>`,
    );
  if (m.series)
    lines.push(
      `<p><strong>${labels.series}:</strong> ${esc(m.series.name)} (${m.series.index})</p>`,
    );
  if (m.description)
    lines.push(
      ...m.description.split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`),
    );
  if (m.version) lines.push(`<p><strong>${labels.version}:</strong> ${esc(m.version)}</p>`);
  const lang = esc(m.language || "en");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}"><head><meta charset="UTF-8"/><title>${esc(displayTitle)}</title><link rel="stylesheet" type="text/css" href="theme.css"/>${includeCustomCss ? '<link rel="stylesheet" type="text/css" href="custom.css"/>' : ""}</head><body><section epub:type="titlepage">${lines.join("")}</section></body></html>`;
}
