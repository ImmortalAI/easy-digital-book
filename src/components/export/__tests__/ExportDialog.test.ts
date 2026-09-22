import { mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExportDialog from "@/components/export/ExportDialog.vue";
import { createInMemoryPlatformServices } from "@/services/platform";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import type { ExportController } from "@/composables/use-export";

describe("ExportDialog", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("disables adding a version to the filename when the book has no version", () => {
    const project = useProjectStore();
    project.setBook({
      metadata: {
        id: "book",
        title: "Novel",
        version: null,
        created: "",
        modified: "",
        language: "en",
        authors: [],
        translators: [],
        series: null,
        description: null,
        cover: null,
      },
      chapters: [{ id: "chapter1", source: "# Chapter" }],
      resources: new Map(),
      customCss: null,
    });
    const settings = useSettingsStore();
    const controller = {
      options: ref({
        imagePreset: "kindle-paperwhite",
        grayscale: false,
        titlePage: true,
        versionInTitle: true,
      }),
      fileName: computed(() => "Novel.epub"),
      warnings: ref([]),
      progress: ref(null),
      exporting: ref(false),
      error: ref(null),
      lastOutput: ref(null),
      exportEpub: vi.fn<ExportController["exportEpub"]>(),
      revealOutput: vi.fn<ExportController["revealOutput"]>(),
    } as unknown as ExportController;

    const wrapper = mount(ExportDialog, {
      props: { controller, services: createInMemoryPlatformServices(), project, settings },
    });

    expect(wrapper.get("[data-export-version]").attributes("disabled")).toBeDefined();
  });
});
