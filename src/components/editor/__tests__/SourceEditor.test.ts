import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { addChapter } from "@/services/book/chapters";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import SourceEditor from "@/components/editor/SourceEditor.vue";
import { chapterEditorStates, resetChapterEditors } from "@/components/editor/editor-commands";
import { EditorView } from "@codemirror/view";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

function makeBook() {
  const initial = createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });
  return addChapter(initial, { newId: () => "chapter2" }).book;
}

describe("SourceEditor lifecycle", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetChapterEditors();
    useProjectStore().setBook(makeBook());
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("rebinds parser callbacks when a cached chapter editor is remounted", async () => {
    const first = mount(SourceEditor, { props: { chapterId: "chapter1" } });
    first.unmount();
    const second = mount(SourceEditor, { props: { chapterId: "chapter1" } });
    const view = EditorView.findFromDOM(second.find(".cm-editor").element as HTMLElement);
    view?.dispatch({ changes: { from: view.state.doc.length, insert: "\n*bad" } });

    vi.advanceTimersByTime(150);
    await second.vm.$nextTick();
    await second.vm.$nextTick();

    expect(second.find(".cm-lintRange-warning").exists()).toBe(true);
    second.unmount();
  });

  it("switches chapters without cross-writing and retains each chapter undo state", async () => {
    const wrapper = mount(SourceEditor, { props: { chapterId: "chapter1" } });
    let view = EditorView.findFromDOM(wrapper.find(".cm-editor").element as HTMLElement)!;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "chapter one edited" },
    });

    await wrapper.setProps({ chapterId: "chapter2" });
    view = EditorView.findFromDOM(wrapper.find(".cm-editor").element as HTMLElement)!;
    expect(view.state.doc.toString()).toBe("# Chapter 2");
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "chapter two edited" },
    });

    await wrapper.setProps({ chapterId: "chapter1" });
    view = EditorView.findFromDOM(wrapper.find(".cm-editor").element as HTMLElement)!;
    expect(view.state.doc.toString()).toBe("chapter one edited");
    expect(useProjectStore().book?.chapters.map((chapter) => chapter.source)).toEqual([
      "chapter one edited",
      "chapter two edited",
    ]);
    expect(chapterEditorStates.get("chapter1")?.doc.toString()).toBe("chapter one edited");
    wrapper.unmount();
  });

  it("reconfigures the content language when book metadata changes", async () => {
    const wrapper = mount(SourceEditor, { props: { chapterId: "chapter1" } });
    const project = useProjectStore();
    project.book!.metadata.language = "ru";
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".cm-content").attributes("lang")).toBe("ru");
    wrapper.unmount();
  });
});
