import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorView as CodeMirrorView } from "@codemirror/view";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import CssEditor from "@/components/editor/CssEditor.vue";
import { createI18nPlugin } from "@/plugins/i18n";
import { useSettingsStore } from "@/stores/settings";

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

  it("names its text box in the interface language and follows the app theme", async () => {
    useProjectStore().setBook(book("1"));
    const settings = useSettingsStore();
    settings.theme = "light";
    const i18n = createI18nPlugin("ru");
    const wrapper = mount(CssEditor, { global: { plugins: [i18n] } });
    const content = () => wrapper.get(".cm-content");
    const view = CodeMirrorView.findFromDOM(wrapper.get(".cm-editor").element as HTMLElement)!;
    expect(content().attributes("aria-label")).toBe("Пользовательский CSS");
    expect(view.state.facet(CodeMirrorView.darkTheme)).toBe(false);

    i18n.global.locale.value = "en";
    settings.theme = "dark";
    await wrapper.vm.$nextTick();
    expect(content().attributes("aria-label")).toBe("Custom CSS");
    expect(view.state.facet(CodeMirrorView.darkTheme)).toBe(true);
    wrapper.unmount();
  });
});
