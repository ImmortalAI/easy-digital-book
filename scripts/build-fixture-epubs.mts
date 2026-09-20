import { mkdir, writeFile } from "node:fs/promises";
import { buildEpub } from "../src/services/epub/build";
import type { Book } from "../src/types/book";
import type { ImageProcessor } from "../src/types/platform";

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
    id: "urn:uuid:fixture",
    title: "Fixture",
    version: "1",
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    language: "en",
    authors: ["Author"],
    translators: ["Translator"],
    series: { name: "Series", index: 1 },
    description: "Fixture book",
    cover: null,
  },
  chapters: [{ id: "one", source: "# Fixture\nText with a footnote[^1].\n\n[^1]: Note" }],
  resources: new Map(),
  customCss: null,
};
await mkdir("fixtures", { recursive: true });
await writeFile(
  "fixtures/fixture.epub",
  await buildEpub(
    book,
    { imagePreset: "kindle-paperwhite", grayscale: false, titlePage: true, versionInTitle: true },
    { imageProcessor: processor, now: () => new Date("2026-01-02T03:04:05Z") },
  ),
);
