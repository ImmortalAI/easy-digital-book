import { mount } from "@vue/test-utils";
import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ChapterItem from "@/components/sidebar/ChapterItem.vue";

const chapter = { id: "chapter1", source: "# Chapter" };

describe("ChapterItem", () => {
  // ContextMenuContent teleports to document.body and this file renders the
  // component more than once; without cleanup the next render's query could
  // match a leftover menu from a previous test.
  afterEach(() => cleanup());

  it("emits navigation and action events for keyboard and HTML5 DnD", async () => {
    const wrapper = mount(ChapterItem, { props: { chapter, index: 1, active: true } });
    const select = wrapper.get(".explorer-chapter__select");
    await select.trigger("keydown", { key: "ArrowUp" });
    await select.trigger("keydown", { key: "ArrowDown" });
    await select.trigger("keydown", { key: "Enter" });
    await select.trigger("keydown", { key: "ArrowUp", altKey: true });
    // ChapterItem's root is now the ContextMenu wrapper (multiple root nodes),
    // so drag events must target the row itself rather than the component root.
    const row = wrapper.get(".explorer-chapter");
    await row.trigger("dragstart", { dataTransfer: new DataTransfer() });
    await row.trigger("dragover", { dataTransfer: new DataTransfer() });
    await row.trigger("drop", { dataTransfer: new DataTransfer() });
    expect(wrapper.emitted("move")?.map(([direction]) => direction)).toEqual([-1]);
    expect(wrapper.emitted("navigate")?.map(([direction]) => direction)).toEqual([-1, 1]);
    expect(wrapper.emitted("select")).toHaveLength(1);
    expect(wrapper.emitted("drag-start")).toHaveLength(1);
    expect(wrapper.emitted("drop")).toHaveLength(1);
  });

  it("opens its own menu on a right click without firing an unrelated action", async () => {
    const { emitted } = render(ChapterItem, { props: { chapter, index: 0, active: false } });
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: screen.getByText("Chapter"),
    });
    expect(await screen.findByRole("menuitem", { name: /delete/i })).toBeVisible();
    expect(emitted().remove).toBeUndefined();
  });
});
