import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBook } from "@/services/book/create";
import { createInMemoryPlatformServices } from "@/services/platform";
import { createExportController } from "@/composables/use-export";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import type { Book } from "@/types/book";
import type { ImageProcessor, PlatformServices } from "@/types/platform";
import type { Logger } from "@/types/platform";
import type { buildEpub } from "@/services/epub/build";

const makeBook = (): Book => ({
  ...createBook({
    locale: "en",
    now: new Date("2026-01-01T00:00:00Z"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  }),
  metadata: {
    ...createBook({
      locale: "en",
      now: new Date("2026-01-01T00:00:00Z"),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    }).metadata,
    title: "Novel",
    version: "v1",
  },
});

const processor: ImageProcessor = {
  process: async ({ bytes, plan }) => ({
    bytes,
    mediaType: plan.format === "png" ? "image/png" : "image/jpeg",
    width: plan.width,
    height: plan.height,
  }),
  dispose: vi.fn<() => void>(),
};

function setup() {
  setActivePinia(createPinia());
  const services = createInMemoryPlatformServices();
  const project = useProjectStore();
  const settings = useSettingsStore();
  project.configure(services);
  settings.configure(services.settings);
  project.setBook(makeBook());
  return { services, project, settings };
}

describe("export controller", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("previews the sanitized EPUB filename with the selected version option", () => {
    const { services, project, settings } = setup();
    const controller = createExportController({
      services,
      project,
      settings,
      imageProcessor: processor,
    });

    expect(controller.fileName.value).toBe("Novel (v1).epub");
    controller.options.value.versionInTitle = false;
    expect(controller.fileName.value).toBe("Novel.epub");
  });

  it("does not write output when export is cancelled", async () => {
    const { services, project, settings } = setup();
    const writeAtomic = vi.spyOn(services.files, "writeFileAtomic");
    const controller = createExportController({
      services,
      project,
      settings,
      imageProcessor: processor,
      build: vi.fn<typeof buildEpub>(),
    });
    const aborted = new AbortController();
    aborted.abort();

    await expect(
      controller.exportEpub({ signal: aborted.signal, path: "/tmp/novel.epub" }),
    ).resolves.toBeNull();
    expect(writeAtomic).not.toHaveBeenCalled();
  });

  it("persists export choices and the output directory after success", async () => {
    const { services, project, settings } = setup();
    const controller = createExportController({
      services,
      project,
      settings,
      imageProcessor: processor,
      build: vi.fn<typeof buildEpub>(async () => new Uint8Array([1, 2, 3])),
    });
    controller.options.value.imagePreset = "original";
    controller.options.value.grayscale = true;
    controller.options.value.titlePage = false;

    await controller.exportEpub({ path: "/exports/Novel.epub" });

    expect(await services.settings.get("export", {})).toMatchObject({
      imagePreset: "original",
      grayscale: true,
      titlePage: false,
      lastDir: "/exports",
    });
  });

  it("logs export failures without book source text", async () => {
    const { services, project, settings } = setup();
    const source = "SECRET BOOK SOURCE";
    project.book!.chapters[0]!.source = source;
    const logger = {
      debug: vi.fn<Logger["debug"]>(),
      info: vi.fn<Logger["info"]>(),
      warn: vi.fn<Logger["warn"]>(),
      error: vi.fn<Logger["error"]>(),
    } satisfies Logger;
    const controller = createExportController({
      services: { ...services, logger } as PlatformServices,
      project,
      settings,
      imageProcessor: processor,
      build: vi.fn<typeof buildEpub>(async () => {
        throw new Error(source);
      }),
    });

    await expect(controller.exportEpub({ path: "/exports/Novel.epub" })).rejects.toThrow(source);
    expect(logger.error).toHaveBeenCalled();
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(source);
  });
});
