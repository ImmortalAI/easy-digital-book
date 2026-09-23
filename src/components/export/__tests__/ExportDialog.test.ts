import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { computed, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportDialog from "@/components/export/ExportDialog.vue";
import { useProjectStore } from "@/stores/project";
import type { ExportController } from "@/composables/use-export";

function bookMetadata(version: string | null) {
  return {
    id: "book",
    title: "Novel",
    version,
    created: "",
    modified: "",
    language: "en",
    authors: [],
    translators: [],
    series: null,
    description: null,
    cover: null,
  };
}

describe("ExportDialog", () => {
  beforeEach(() => setActivePinia(createPinia()));
  // Dialog teleports its content to document.body and this file renders it
  // more than once; without cleanup the next render's query could match a
  // still-mounted node left over from the previous test.
  afterEach(() => cleanup());

  it("disables adding a version to the filename when the book has no version", async () => {
    const project = useProjectStore();
    project.setBook({
      metadata: bookMetadata(null),
      chapters: [{ id: "chapter1", source: "# Chapter" }],
      resources: new Map(),
      customCss: null,
    });
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

    render(ExportDialog, { props: { controller, project } });

    // ExportDialog now teleports its content to document.body (Dialog's
    // portal), so it is queried through testing-library's document-wide screen
    // rather than a mounted wrapper's tree.
    const versionCheckbox = await screen.findByRole("checkbox", { name: /add version to title/i });
    expect(versionCheckbox.hasAttribute("disabled")).toBe(true);
  });

  it("exports with the chosen preset and reports success", async () => {
    const project = useProjectStore();
    project.setBook({
      metadata: bookMetadata("1.0.0"),
      chapters: [{ id: "chapter1", source: "# Chapter" }],
      resources: new Map(),
      customCss: null,
    });
    const controller = {
      options: ref({
        imagePreset: "kindle-paperwhite",
        grayscale: false,
        titlePage: true,
        versionInTitle: false,
      }),
      fileName: computed(() => "Novel.epub"),
      warnings: ref([]),
      progress: ref(null),
      exporting: ref(false),
      error: ref(null),
      lastOutput: ref(null),
      exportEpub: vi.fn<ExportController["exportEpub"]>().mockResolvedValue("Novel.epub"),
      revealOutput: vi.fn<ExportController["revealOutput"]>(),
    } as unknown as ExportController;

    render(ExportDialog, { props: { controller, project } });
    // The preset control is a shadcn-vue Select (a Reka listbox), not a native
    // <select>, so it is driven by opening the combobox and clicking an option
    // rather than userEvent.selectOptions. findByRole (rather than getByRole)
    // waits out Dialog's initial teleport-mount tick.
    await userEvent.click(await screen.findByRole("combobox", { name: /image preset/i }));
    await userEvent.click(await screen.findByRole("option", { name: /without changes/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /grayscale/i }));
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("EPUB saved");
  });

  it("starts fresh after closing and reopening, not stuck on the last success", async () => {
    // EditorView keeps ExportDialog mounted permanently and only toggles its
    // `open` model (it no longer remounts the component per open), so a
    // successful export must not leave the dialog stuck on the "EPUB saved"
    // screen the next time it's opened.
    const project = useProjectStore();
    project.setBook({
      metadata: bookMetadata("1.0.0"),
      chapters: [{ id: "chapter1", source: "# Chapter" }],
      resources: new Map(),
      customCss: null,
    });
    const controller = {
      options: ref({
        imagePreset: "kindle-paperwhite",
        grayscale: false,
        titlePage: true,
        versionInTitle: false,
      }),
      fileName: computed(() => "Novel.epub"),
      warnings: ref([]),
      progress: ref(null),
      exporting: ref(false),
      error: ref(null),
      lastOutput: ref(null),
      exportEpub: vi.fn<ExportController["exportEpub"]>().mockResolvedValue("Novel.epub"),
      revealOutput: vi.fn<ExportController["revealOutput"]>(),
    } as unknown as ExportController;

    const { rerender } = render(ExportDialog, { props: { controller, project, open: true } });
    await userEvent.click(await screen.findByRole("button", { name: /export/i }));
    expect((await screen.findByRole("status")).textContent).toContain("EPUB saved");

    await rerender({ controller, project, open: false });
    await rerender({ controller, project, open: true });

    expect(screen.queryByRole("status")).toBeNull();
    expect(await screen.findByRole("button", { name: /export/i })).not.toBeNull();
  });
});
