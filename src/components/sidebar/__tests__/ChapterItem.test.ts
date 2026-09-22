import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ChapterItem from "@/components/sidebar/ChapterItem.vue";

const chapter = { id: "chapter1", source: "# Chapter" };

describe("ChapterItem", () => {
  it("emits navigation and action events for keyboard and HTML5 DnD", async () => {
    const wrapper = mount(ChapterItem, { props: { chapter, index: 1, active: true } });
    await wrapper.trigger("keydown", { key: "ArrowUp" });
    await wrapper.trigger("keydown", { key: "ArrowDown" });
    await wrapper.trigger("keydown", { key: "Enter" });
    await wrapper.trigger("dragstart", { dataTransfer: new DataTransfer() });
    await wrapper.trigger("dragover", { dataTransfer: new DataTransfer() });
    await wrapper.trigger("drop", { dataTransfer: new DataTransfer() });
    expect(wrapper.emitted("move")?.map(([direction]) => direction)).toEqual([-1, 1]);
    expect(wrapper.emitted("select")).toHaveLength(1);
    expect(wrapper.emitted("drag-start")).toHaveLength(1);
    expect(wrapper.emitted("drop")).toHaveLength(1);
  });

  it("does not turn contextmenu into an unrelated image-cover action", async () => {
    const wrapper = mount(ChapterItem, { props: { chapter, index: 0, active: false } });
    await wrapper.trigger("contextmenu");
    expect(wrapper.emitted("contextmenu")).toHaveLength(1);
    expect(wrapper.emitted("remove")).toBeUndefined();
  });
});
