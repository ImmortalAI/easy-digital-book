import { AppError } from "@/types/errors";
import type { Book, Resource } from "@/types/book";
import type { ImageProcessor } from "@/types/platform";
import { renderChapter, type RenderedChapter } from "./chapter";
import { planImage } from "./resources";
import { containerXml } from "./container";
import { navXhtml } from "./nav";
import { ncx } from "./ncx";
import { opf } from "./opf";
import { titlePage } from "./title-page";
import { makeZip } from "./zip";
import { themeCss } from "@/assets/epub/theme.css";
import { customCssTemplate } from "@/assets/epub/custom.css";
import type { ProcessedImage } from "@/types/platform";

export interface ExportOptions {
  imagePreset: "kindle-paperwhite" | "original";
  grayscale: boolean;
  titlePage: boolean;
  versionInTitle: boolean;
}
export interface BuildEpubDependencies {
  imageProcessor: ImageProcessor;
  now: () => Date;
  onProgress?: (progress: {
    stage: "chapters" | "images" | "zip";
    done: number;
    total: number;
  }) => void;
  signal?: AbortSignal;
}
const cache = new Map<string, ProcessedImage>();
const check = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new AppError("export.cancelled", "Export cancelled");
};
async function sha(bytes: Uint8Array): Promise<string> {
  // Web Crypto is supplied by the runtime (browser WebView or Node test runner).
  // eslint-disable-next-line no-restricted-globals
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function dimensions(resource: Resource): { width: number; height: number; hasAlpha?: boolean } {
  const b = resource.bytes;
  if (resource.mediaType === "image/png" && b.length > 24)
    return {
      width: new DataView(b.buffer, b.byteOffset).getUint32(16),
      height: new DataView(b.buffer, b.byteOffset).getUint32(20),
      hasAlpha: b[25] === 6 || b[25] === 4,
    };
  if (resource.mediaType === "image/jpeg") {
    for (let i = 2; i + 9 < b.length; i++)
      if (b[i] === 0xff && b[i + 1] >= 0xc0 && b[i + 1] <= 0xc3)
        return { width: (b[i + 7] << 8) | b[i + 8], height: (b[i + 5] << 8) | b[i + 6] };
  }
  return { width: 1, height: 1 };
}
export async function buildEpub(
  book: Book,
  options: ExportOptions,
  deps: BuildEpubDependencies,
): Promise<Uint8Array> {
  check(deps.signal);
  const allMap = new Map<string, string>();
  for (const path of book.resources.keys())
    allMap.set(path, `images/${path.split("/").pop() ?? path}`);
  const chapters: RenderedChapter[] = [];
  for (let i = 0; i < book.chapters.length; i++) {
    check(deps.signal);
    chapters.push(renderChapter(book.chapters[i], i, book, allMap));
    deps.onProgress?.({ stage: "chapters", done: i + 1, total: book.chapters.length });
  }
  const used = new Set<string>();
  chapters.forEach((chapter) => chapter.referencedPaths.forEach((p) => used.add(p)));
  if (book.metadata.cover && book.resources.has(book.metadata.cover)) used.add(book.metadata.cover);
  const imagePaths = [...used].filter((p) => book.resources.has(p)).sort();
  const processed: Array<{ source: string; output: ProcessedImage }> = [];
  for (let i = 0; i < imagePaths.length; i++) {
    check(deps.signal);
    const source = imagePaths[i];
    const resource = book.resources.get(source) as Resource;
    const meta = dimensions(resource);
    const plan = planImage(
      { mediaType: resource.mediaType, ...meta },
      options,
      source === book.metadata.cover,
    );
    const key = `${await sha(resource.bytes)}:${JSON.stringify(plan)}`;
    let output = cache.get(key);
    if (!output) {
      output = await deps.imageProcessor.process({ bytes: resource.bytes, plan }, deps.signal);
      cache.set(key, output);
    }
    processed.push({ source, output });
    deps.onProgress?.({ stage: "images", done: i + 1, total: imagePaths.length });
  }
  check(deps.signal);
  const exported = deps.now();
  const entries: Array<[string, string | Uint8Array]> = [
    ["mimetype", "application/epub+zip"],
    ["META-INF/container.xml", containerXml],
  ];
  const resourceEntries = processed.map(({ source, output }) => ({
    path: `OEBPS/${allMap.get(source)}`,
    mediaType: output.mediaType,
    id: source === book.metadata.cover ? "cover-image" : `image-${imagePaths.indexOf(source) + 1}`,
    output,
  }));
  entries.push([
    "OEBPS/content.opf",
    opf(
      book,
      chapters,
      resourceEntries.map((r) => ({ path: r.path ?? "", mediaType: r.mediaType, id: r.id })),
      options.titlePage,
      exported,
    ),
  ]);
  entries.push(
    ["OEBPS/nav.xhtml", navXhtml(chapters, options.titlePage, book.metadata.title)],
    ["OEBPS/toc.ncx", ncx(chapters, book.metadata.id, book.metadata.title)],
  );
  if (options.titlePage) entries.push(["OEBPS/title.xhtml", titlePage(book)]);
  chapters.forEach((chapter, i) => entries.push([`OEBPS/chapter-${i + 1}.xhtml`, chapter.xhtml]));
  entries.push(
    ["OEBPS/theme.css", themeCss],
    ["OEBPS/custom.css", book.customCss ?? customCssTemplate],
  );
  for (const r of resourceEntries) entries.push([r.path ?? "", r.output.bytes]);
  deps.onProgress?.({ stage: "zip", done: 0, total: entries.length });
  check(deps.signal);
  const result = await makeZip(entries);
  deps.onProgress?.({ stage: "zip", done: entries.length, total: entries.length });
  return result;
}
