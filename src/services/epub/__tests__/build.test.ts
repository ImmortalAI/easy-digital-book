import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildEpub } from "@/services/epub/build";
import { opf } from "@/services/epub/opf";
import type { Book } from "@/types/book";
import type { ImageProcessor } from "@/types/platform";

const processor: ImageProcessor = {
  process: async ({ bytes, plan }) => ({
    bytes,
    mediaType: plan.format === "png" ? "image/png" : "image/jpeg",
    width: plan.width,
    height: plan.height,
  }),
  dispose: () => {},
};
const book: Book = {
  metadata: {
    id: "urn:uuid:test",
    title: "Novel",
    version: "1",
    created: "2026-01-01T00:00:00Z",
    modified: "2026-01-01T00:00:00Z",
    language: "en",
    authors: ["Author"],
    translators: ["Translator"],
    series: { name: "Series", index: 2 },
    description: "A book",
    cover: "images/cover.png",
  },
  chapters: [
    { id: "one", source: "# One\nHello [^a].\n\n[^a]: Note" },
    { id: "two", source: "No heading" },
  ],
  resources: new Map([
    [
      "images/cover.png",
      {
        mediaType: "image/png",
        bytes: new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8,
          6,
        ]),
      },
    ],
  ]),
  customCss: null,
};

describe("buildEpub", () => {
  it("writes a structurally valid deterministic EPUB3 archive", async () => {
    const deps = { imageProcessor: processor, now: () => new Date("2026-01-02T03:04:05Z") };
    const bytes = await buildEpub(
      book,
      { imagePreset: "original", grayscale: false, titlePage: true, versionInTitle: true },
      deps,
    );
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    expect(names.slice(0, 3)).toEqual(["mimetype", "META-INF/container.xml", "OEBPS/content.opf"]);
    expect(zip.files.mimetype.options.compression).toBeNull();
    expect(await zip.file("OEBPS/content.opf")?.async("string")).toContain("dcterms:modified");
    expect(await zip.file("OEBPS/content.opf")?.async("string")).toContain("urn:uuid:test");
    expect(names).toContain("OEBPS/title.xhtml");
    expect(names).toContain("OEBPS/images/cover.png");
    const again = await buildEpub(
      book,
      { imagePreset: "original", grayscale: false, titlePage: true, versionInTitle: true },
      deps,
    );
    expect([...again]).toEqual([...bytes]);
  });

  it("uses unique translator refinement ids when names repeat", () => {
    const duplicate = { ...book, metadata: { ...book.metadata, translators: ["Same", "Same"] } };
    const output = opf(duplicate, [], [], false, new Date("2026-01-02T03:04:05Z"), false);
    expect(output).toContain('id="translator-0"');
    expect(output).toContain('id="translator-1"');
    expect(output).toContain('refines="#translator-0"');
    expect(output).toContain('refines="#translator-1"');
  });
});
