import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorView as CodeMirrorView } from "@codemirror/view";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import CssEditor from "@/components/editor/CssEditor.vue";

function book(id: string, css: string | null = null) {
  return {
    ...createBook({
      locale: "en",
      now: new Date("2026-01-01"),
      newUuid: () => `550e8400-e29b-41d4-a716-44665544000${id}`,
      newChapterId: () => "chapter1",
    }),
    customCss: css,
  };
}

describe("CssEditor lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
  });

  it("mutates the active project synchronously and never writes a later project", async () => {
    const project = useProjectStore();
    project.setBook(book("1"));
    const wrapper = mount(CssEditor);
    const editor = wrapper.get(".cm-editor");
    const view = CodeMirrorView.findFromDOM(editor.element as HTMLElement);
    expect(view).toBeDefined();
    view!.dispatch({ changes: { from: 0, insert: "h1 {}" } });
    expect(project.book?.customCss).toContain("h1 {}");

    project.setBook(book("2"));
    vi.advanceTimersByTime(200);
    expect(project.book?.metadata.id).toContain("2");
    expect(project.book?.customCss).toBeNull();
    wrapper.unmount();
  });
});
