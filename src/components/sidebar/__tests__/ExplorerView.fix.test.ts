import { createPinia, setActivePinia } from "pinia";
import { DOMWrapper, mount } from "@vue/test-utils";
import { screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { useNotificationsStore } from "@/stores/notifications";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import ExplorerView from "@/components/sidebar/ExplorerView.vue";
import { EditorView } from "@codemirror/view";
import {
  createChapterEditor,
  registerChapterEditorView,
  resetChapterEditors,
} from "@/components/editor/editor-commands";

// ConfirmDialog now teleports its content to document.body (AlertDialog's
// portal), so it is no longer reachable through the mounted wrapper's tree.
function confirmDialog(): DOMWrapper<HTMLElement> {
  const el = document.body.querySelector<HTMLElement>('[role="alertdialog"]');
  if (!el) throw new Error("Expected the confirm dialog to be open");
  return new DOMWrapper(el);
}

describe("ExplorerView destructive actions", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("offers explicit image actions and undoable resource deletion", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.resources.set("images/cover.png", { bytes: new Uint8Array([1]), mediaType: "image/png" });
    project.setBook(book);
    useSettingsStore().confirmDelete = false;
    const wrapper = mount(ExplorerView);

    await wrapper.get(".explorer-image").trigger("contextmenu");
    await userEvent.click(await screen.findByRole("menuitem", { name: /make cover/i }));
    expect(project.book?.metadata.cover).toBe("images/cover.png");

    await wrapper.get(".explorer-image").trigger("contextmenu");
    await userEvent.click(await screen.findByRole("menuitem", { name: /^delete$/i }));
    expect(project.book?.resources.has("images/cover.png")).toBe(false);
    expect(project.book?.metadata.cover).toBeNull();
    const items = useNotificationsStore().items;
    items[items.length - 1]?.undo?.();
    expect(project.book?.resources.has("images/cover.png")).toBe(true);
    expect(project.book?.metadata.cover).toBe("images/cover.png");
    wrapper.unmount();
  });

  it("confirms unused-resource deletion with the affected names and deletes all selected resources", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.chapters[0]!.source = "# First\n![](images/used.png)";
    book.chapters.push({ id: "chapter2", source: "# Second" });
    for (const path of ["images/used.png", "images/unused-a.png", "images/unused-b.png"])
      book.resources.set(path, { bytes: new Uint8Array([1]), mediaType: "image/png" });
    project.setBook(book);
    const wrapper = mount(ExplorerView);

    const imagesSection = wrapper.findAll(".explorer-section")[2]!;
    await imagesSection.findAll(".explorer-section__action button")[1]!.trigger("click");

    expect(wrapper.findComponent({ name: "ConfirmDialog" }).exists()).toBe(true);
    const dialog = confirmDialog();
    expect(dialog.get("h2").text()).toContain("Delete unused images");
    // The affected names live in the dialog's accessible description; scope by
    // role rather than a styling/geometry data-* hook.
    expect(dialog.text()).toContain("unused-a.png");
    expect(dialog.text()).toContain("unused-b.png");
    expect(dialog.text()).not.toContain("chapter1");

    await dialog.get("[data-confirm-delete]").trigger("click");
    expect([...project.book!.resources.keys()]).toEqual(["images/used.png"]);
    wrapper.unmount();
  });

  it("pushes an inserted image into the open editor so the next keystroke keeps it", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.chapters[0]!.source = "# First";
    book.resources.set("images/pic.png", { bytes: new Uint8Array([1]), mediaType: "image/png" });
    project.setBook(book);

    resetChapterEditors();
    const view = new EditorView({ state: createChapterEditor("chapter1", "# First") });
    registerChapterEditorView("chapter1", view);

    const wrapper = mount(ExplorerView);
    await wrapper.get(".explorer-image").trigger("contextmenu");
    await userEvent.click(await screen.findByRole("menuitem", { name: /insert in text/i }));

    expect(project.book?.chapters[0]?.source).toContain("![](images/pic.png)");
    // The editor must carry the insert too: it writes its own doc back to the
    // model on the next keystroke, which would otherwise drop the image.
    expect(view.state.doc.toString()).toContain("![](images/pic.png)");

    view.destroy();
    resetChapterEditors();
    wrapper.unmount();
  });

  it("shows chapter names, not internal IDs, when confirming a used-image deletion", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.chapters[0]!.source = "# First\n![](images/used.png)";
    book.chapters.push({ id: "chapter2", source: "# Second\n![](images/used.png)" });
    book.resources.set("images/used.png", {
      bytes: new Uint8Array([1]),
      mediaType: "image/png",
    });
    project.setBook(book);
    const wrapper = mount(ExplorerView);

    await wrapper.get(".explorer-image").trigger("contextmenu");
    await userEvent.click(await screen.findByRole("menuitem", { name: /^delete$/i }));

    expect(wrapper.findComponent({ name: "ConfirmDialog" }).exists()).toBe(true);
    // Scope by role rather than a styling/geometry data-* hook.
    const details = confirmDialog().text();
    expect(details).toContain("First");
    expect(details).toContain("Second");
    expect(details).not.toContain("chapter1");
    expect(details).not.toContain("chapter2");
    wrapper.unmount();
  });

  it("persists the do-not-ask-again choice from chapter confirmation", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.chapters.push({ id: "chapter2", source: "# Two" });
    project.setBook(book);
    const settings = useSettingsStore();
    const wrapper = mount(ExplorerView);
    await wrapper.findAll(".explorer-chapter__actions button")[1]!.trigger("click");
    expect(wrapper.findComponent({ name: "ConfirmDialog" }).exists()).toBe(true);
    const dialog = confirmDialog();
    await dialog.get('[role="checkbox"]').trigger("click");
    await dialog.get("[data-confirm-delete]").trigger("click");
    expect(settings.confirmDelete).toBe(false);
    expect(project.book?.chapters).toHaveLength(1);
    wrapper.unmount();
  });
});
