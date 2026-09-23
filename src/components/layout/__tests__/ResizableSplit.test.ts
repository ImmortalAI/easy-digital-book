import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import ResizableSplit from "@/components/layout/ResizableSplit.vue";
import { useLayoutStore } from "@/stores/layout";

describe("ResizableSplit", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("collapses the preview in text mode instead of unmounting it", async () => {
    const wrapper = mount(ResizableSplit, {
      slots: { preview: '<div data-testid="preview-body" />' },
    });
    useLayoutStore().mode = "text";
    await nextTick();
    // The iframe is built once and owns a blob cache; unmounting it loses both.
    expect(wrapper.find('[data-testid="preview-body"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="preview"]').attributes("data-state")).toBe("collapsed");
  });

  it("keeps the split ratio as a ratio when the group reports a layout", async () => {
    const layout = useLayoutStore();
    const wrapper = mount(ResizableSplit);
    // Let the group derive its initial layout from the store first; its own
    // report would otherwise land after the one under test.
    await nextTick();
    // The inner group (source/preview) is the last one; the outer group holds the sidebar.
    const groups = wrapper.findAllComponents({ name: "SplitterGroup" });
    await groups[groups.length - 1]!.vm.$emit("layout", [30, 70]);
    expect(layout.splitRatio).toBeCloseTo(0.3, 5);
  });

  it("keeps the stored ratio while a pane is hidden", async () => {
    const layout = useLayoutStore();
    const wrapper = mount(ResizableSplit);
    await nextTick();
    layout.splitRatio = 0.35;
    layout.mode = "text";
    await nextTick();

    const groups = wrapper.findAllComponents({ name: "SplitterGroup" });
    await groups[groups.length - 1]!.vm.$emit("layout", [100, 0]);

    expect(layout.splitRatio).toBe(0.35);
    expect(wrapper.get('[aria-label="Resize editor and preview"]').attributes("style")).toContain(
      "display: none",
    );
  });

  it("persists the sidebar width in pixels within its limits", async () => {
    const layout = useLayoutStore();
    const wrapper = mount(ResizableSplit);
    const outer = wrapper.findAllComponents({ name: "SplitterGroup" })[0]!;

    await outer.vm.$emit("layout", [310, 900]);
    expect(layout.sidebarWidth).toBe(310);

    await outer.vm.$emit("layout", [900, 300]);
    expect(layout.sidebarWidth).toBe(400);
  });

  it("resets the persisted content ratio to 50/50 on double click", async () => {
    const layout = useLayoutStore();
    const wrapper = mount(ResizableSplit, { slots: { source: "source", preview: "preview" } });
    await nextTick();
    layout.splitRatio = 0.7;

    await wrapper.get('[aria-label="Resize editor and preview"]').trigger("dblclick");

    expect(layout.splitRatio).toBeCloseTo(0.5, 5);
  });

  it("puts the single pane in place of the source and preview panes", () => {
    const wrapper = mount(ResizableSplit, {
      props: { singlePane: true },
      slots: { single: '<div data-testid="single-body" />' },
    });

    expect(wrapper.find("[data-single-pane] [data-testid=single-body]").exists()).toBe(true);
    expect(wrapper.find('[data-pane="source"]').exists()).toBe(false);
  });

  it("retains pane slot elements while changing modes", async () => {
    const layout = useLayoutStore();
    const wrapper = mount(ResizableSplit, {
      slots: { source: "source", preview: '<iframe data-preview-frame="true" />' },
    });
    const frame = wrapper.get("[data-preview-frame]").element;

    layout.mode = "text";
    await wrapper.vm.$nextTick();
    layout.mode = "preview";
    await wrapper.vm.$nextTick();

    expect(wrapper.get("[data-preview-frame]").element).toBe(frame);
    expect(wrapper.find('[data-pane="source"]').exists()).toBe(true);
  });
});
