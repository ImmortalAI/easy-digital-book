import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import { useDiagnosticsStore } from "@/stores/diagnostics";
import ExplorerView from "@/components/sidebar/ExplorerView.vue";

describe("ExplorerView boundaries", () => {
  beforeEach(() => setActivePinia(createPinia()));
  // ContextMenuContent teleports to document.body and some of these tests
  // render more than once; without cleanup the next render's query could
  // match a leftover menu from a previous test.
  afterEach(() => cleanup());

  it("does not dirty the project when moving the first/last chapter out of bounds", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.chapters.push({ id: "chapter2", source: "# Two" });
    project.setBook(book);
    const wrapper = mount(ExplorerView);
    const rows = wrapper.findAll(".explorer-chapter__select");
    await rows[0]!.trigger("keydown", { key: "ArrowUp", altKey: true });
    await rows[1]!.trigger("keydown", { key: "ArrowDown", altKey: true });
    expect(project.revision).toBe(0);
    expect(project.dirty).toBe(false);
  });

  it("opens the image actions menu from a right click without changing the cover", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.resources.set("images/a.png", { bytes: new Uint8Array([1]), mediaType: "image/png" });
    project.setBook(book);

    render(ExplorerView, { global: { plugins: [pinia] } });
    await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByText("a.png") });

    expect(await screen.findByRole("menuitem", { name: /make cover/i })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: /find usages/i })).toBeVisible();
    expect(project.book?.metadata.cover).toBeNull();
  });

  it("forwards image contextmenu with its path alongside opening the menu", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.resources.set("images/a.png", { bytes: new Uint8Array([1]), mediaType: "image/png" });
    project.setBook(book);
    const wrapper = mount(ExplorerView);

    await wrapper.get(".explorer-image").trigger("contextmenu");

    expect(wrapper.emitted("image-context-menu")?.[0]?.[0]).toBe("images/a.png");
    expect(await screen.findByRole("menuitem", { name: /make cover/i })).toBeVisible();
    expect(project.book?.metadata.cover).toBeNull();
    wrapper.unmount();
  });

  it("offers the chapter actions from a right click", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const project = useProjectStore();
    project.setBook(
      createBook({
        locale: "en",
        now: new Date(),
        newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
        newChapterId: () => "chapter1",
      }),
    );

    render(ExplorerView, { global: { plugins: [pinia] } });
    await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByText("Chapter 1") });
    expect(await screen.findByRole("menuitem", { name: /new chapter after/i })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeVisible();
  });

  it("passes chapter warning counts to chapter rows", () => {
    const project = useProjectStore();
    project.setBook(
      createBook({
        locale: "en",
        now: new Date(),
        newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
        newChapterId: () => "chapter1",
      }),
    );
    useDiagnosticsStore().setChapterDiagnostics("chapter1", [
      { severity: "warning", message: "Warning" },
      { severity: "warning", message: "Another warning" },
    ]);

    const wrapper = mount(ExplorerView);

    expect(wrapper.findComponent({ name: "ChapterItem" }).props("warningCount")).toBe(2);
  });
});
