import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { useNotificationsStore } from "@/stores/notifications";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import ExplorerView from "@/components/sidebar/ExplorerView.vue";

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

    await wrapper.get(".explorer-image").trigger("contextmenu", { clientX: 10, clientY: 10 });
    await wrapper.findComponent({ name: "ContextMenu" }).vm.$emit("select", "cover");
    expect(project.book?.metadata.cover).toBe("images/cover.png");
    await wrapper.get(".explorer-image").trigger("contextmenu");
    await wrapper.findComponent({ name: "ContextMenu" }).vm.$emit("select", "delete");
    expect(project.book?.resources.has("images/cover.png")).toBe(false);
    const items = useNotificationsStore().items;
    items[items.length - 1]?.undo?.();
    expect(project.book?.resources.has("images/cover.png")).toBe(true);
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
    const dialog = wrapper.findComponent({ name: "ConfirmDialog" });
    await dialog.get('input[type="checkbox"]').setValue(false);
    await dialog.get("button:last-child").trigger("click");
    expect(settings.confirmDelete).toBe(false);
    expect(project.book?.chapters).toHaveLength(1);
    wrapper.unmount();
  });
});
