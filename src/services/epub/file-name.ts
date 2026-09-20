import type { BookMetadata } from "@/types/book";

const reserved = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;

export function makeEpubFileName(
  metadata: Pick<BookMetadata, "title" | "version">,
  versionInTitle: boolean,
): string {
  const suffix = versionInTitle && metadata.version ? ` (${metadata.version})` : "";
  let basename = `${metadata.title}${suffix}`
    .replace(/[<>:"/\\|?*]/g, "_")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 0x20 || code === 0x7f ? "_" : char;
    })
    .join("")
    .trim()
    .replace(/[. ]+$/g, "");
  if (!basename) basename = "book";
  if (reserved.test(basename)) basename = `_${basename}`;
  return `${basename.slice(0, 120)}.epub`;
}
