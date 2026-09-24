import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChapterItem from "@/components/sidebar/ChapterItem.vue";
import { Tree } from "@/components/ui/tree";

const chapter = { id: "chapter1", source: "# Chapter" };
const node = { id: "chapter:chapter1" };

/** ChapterItem renders a TreeItem, which only works inside a Tree. */
function inTree(props: { index: number; onRemove?: () => void }) {
  return defineComponent({
    setup: () => () =>
      h(
        Tree,
        { items: [node], getKey: (item: Record<string, unknown>) => String(item.id) },
        { default: () => h(ChapterItem, { bind: { value: node, level: 1 }, chapter, ...props }) },
      ),
  });
}

describe("ChapterItem", () => {
  // ContextMenuContent teleports to document.body and this file renders the
  // component more than once; without cleanup the next render's query could
  // match a leftover menu from a previous test.
  afterEach(() => cleanup());

  it("emits select, reorder and HTML5 DnD events from its tree row", async () => {
    const wrapper = mount(inTree({ index: 1 }));
    const item = wrapper.findComponent(ChapterItem);
    const row = wrapper.get('[role="treeitem"]');
    await row.trigger("keydown", { key: "Enter" });
    await row.trigger("keydown", { key: "ArrowUp", altKey: true });
    await row.trigger("keydown", { key: "ArrowDown", altKey: true });
    await row.trigger("dragstart", { dataTransfer: new DataTransfer() });
    await row.trigger("dragover", { dataTransfer: new DataTransfer() });
    await row.trigger("drop", { dataTransfer: new DataTransfer() });
    expect(item.emitted("select")).toHaveLength(1);
    expect(item.emitted("move")?.map(([direction]) => direction)).toEqual([-1, 1]);
    expect(item.emitted("drag-start")).toHaveLength(1);
    expect(item.emitted("drop")).toHaveLength(1);
    // Selection belongs to the explorer (layout.center), so the tree's own
    // model must not pick the row up on its own.
    expect(row.attributes("aria-selected")).toBe("false");
  });

  it("names the row by its number and title, not its action buttons", () => {
    render(inTree({ index: 0 }));
    expect(screen.getByRole("treeitem")).toHaveAccessibleName("1. Chapter");
    expect(screen.getByRole("button", { name: /new chapter after/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible();
  });

  it("opens its own menu on a right click without firing an unrelated action", async () => {
    const onRemove = vi.fn<() => void>();
    render(inTree({ index: 0, onRemove }));
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: screen.getByText("Chapter"),
    });
    expect(await screen.findByRole("menuitem", { name: /delete/i })).toBeVisible();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
