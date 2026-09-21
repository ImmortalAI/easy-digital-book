import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { chapterParseResults, resetChapterParseResults } from "@/composables/use-novlang-parse";
import { useLayoutStore } from "@/stores/layout";
import { createBook } from "@/services/book/create";
import { createInMemoryPlatformServices } from "@/services/platform";
import { useProjectStore } from "@/stores/project";
import { EditorView as CodeMirrorView } from "@codemirror/view";
import EditorView from "@/views/EditorView.vue";

function bookWithTwoChapters() {
  const book = createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });
  book.chapters.push({ id: "chapter2", source: "# Second chapter" });
  return book;
}

const parsedHeading = (value: string) => ({
  document: {
    type: "document" as const,
    children: [{ type: "heading" as const, children: [{ type: "text" as const, value }] }],
  },
  diagnostics: [],
});

describe("EditorView Task 13 integration", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetChapterParseResults();
    useProjectStore().setBook(bookWithTwoChapters());
  });

  it("retains the same iframe and source editor across mode changes", async () => {
    const layout = useLayoutStore();
    layout.center = { kind: "chapter", id: "chapter2" };
    chapterParseResults.set("chapter2", parsedHeading("Second chapter"));
    const wrapper = mount(EditorView);
    const iframe = wrapper.get("iframe").element;
    const editor = wrapper.get(".cm-editor").element;

    layout.mode = "text";
    await wrapper.vm.$nextTick();
    layout.mode = "preview";
    await wrapper.vm.$nextTick();

    expect(wrapper.get("iframe").element).toBe(iframe);
    expect(wrapper.get(".cm-editor").element).toBe(editor);
    wrapper.unmount();
  });

  it("keeps a visible activity bar and applies explorer/search toggle semantics", async () => {
    const layout = useLayoutStore();
    const wrapper = mount(EditorView);
    expect(wrapper.get("[data-activity-bar]").attributes("data-width")).toBe("48");

    await wrapper.get('[data-activity="explorer"]').trigger("click");
    expect(layout.sidebarVisible).toBe(false);
    await wrapper.get('[data-activity="explorer"]').trigger("click");
    expect(layout.sidebarVisible).toBe(true);
    await wrapper.get('[data-activity="search"]').trigger("click");
    expect(layout.activeView).toBe("search");
    expect(layout.sidebarVisible).toBe(true);
    await wrapper.get('[data-activity="search"]').trigger("click");
    expect(layout.sidebarVisible).toBe(false);
    wrapper.unmount();
  });

  it("opens settings as a single-pane activity and persists the global sidebar toggle", async () => {
    const layout = useLayoutStore();
    const services = createInMemoryPlatformServices();
    layout.configure(services.settings);
    const wrapper = mount(EditorView);

    await wrapper.get('[data-activity="settings"]').trigger("click");
    expect(layout.center).toEqual({ kind: "settings" });
    expect(layout.sidebarVisible).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "\\", ctrlKey: true }));
    await nextTick();
    expect(layout.sidebarVisible).toBe(true);
    expect(await services.settings.get("layout", {})).toMatchObject({ sidebarVisible: true });
    wrapper.unmount();
  });

  it("uses one central pane for metadata/image/settings and keeps the last CSS preview chapter", async () => {
    const layout = useLayoutStore();
    layout.center = { kind: "chapter", id: "chapter2" };
    const wrapper = mount(EditorView);
    chapterParseResults.set("chapter2", parsedHeading("Second chapter"));
    wrapper.get("iframe").element.dispatchEvent(new Event("load"));
    await nextTick();
    await nextTick();
    expect(wrapper.findComponent({ name: "PreviewPane" }).props("chapterId")).toBe("chapter2");

    layout.center = { kind: "css" };
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".preview-pane").exists()).toBe(true);
    expect(wrapper.findComponent({ name: "PreviewPane" }).props("chapterId")).toBe("chapter2");

    for (const center of [
      { kind: "metadata" },
      { kind: "image", path: "images/a.png" },
      { kind: "settings" },
    ] as const) {
      layout.center = center;
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".editor-single-pane").exists()).toBe(true);
      expect(wrapper.find(".preview-pane").exists()).toBe(false);
    }
    wrapper.unmount();
  });

  it("navigates to a selected warning chapter and position", async () => {
    const layout = useLayoutStore();
    const project = useProjectStore();
    project.book!.chapters[1]!.source = "# Second chapter\n*unclosed";
    layout.center = { kind: "chapter", id: "chapter1" };
    const wrapper = mount(EditorView);
    const warnings = wrapper.findComponent({ name: "WarningsPopover" });

    await warnings.vm.$emit("select", {
      chapterId: "chapter2",
      position: { line: 2, column: 1 },
    });
    await wrapper.vm.$nextTick();
    expect(layout.center).toEqual({ kind: "chapter", id: "chapter2" });
    const editor = CodeMirrorView.findFromDOM(wrapper.get(".cm-editor").element as HTMLElement)!;
    expect(editor.state.selection.main.from).toBeGreaterThan(0);
    expect(editor.state.selection.main.to).toBeGreaterThan(editor.state.selection.main.from);
    wrapper.unmount();
  });
});
