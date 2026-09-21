import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResizableSplit from "@/components/layout/ResizableSplit.vue";
import { useLayoutStore } from "@/stores/layout";

describe("ResizableSplit", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("captures the pointer and persists a sidebar resize", async () => {
    const layout = useLayoutStore();
    layout.sidebarWidth = 250;
    const wrapper = mount(ResizableSplit, {
      slots: {
        sidebar: "sidebar",
        source: "source",
        preview: "preview",
      },
    });
    const handle = wrapper.get('[data-resize="sidebar"]');
    const capture = vi.fn<(pointerId: number) => void>();
    Object.defineProperty(handle.element, "setPointerCapture", { value: capture });

    await handle.trigger("pointerdown", { clientX: 250, pointerId: 7 });
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 310, pointerId: 7 }));

    expect(capture).toHaveBeenCalledWith(7);
    expect(layout.sidebarWidth).toBe(310);
  });

  it("resets the persisted content ratio to 50/50 on double click", async () => {
    const layout = useLayoutStore();
    layout.splitRatio = 0.7;
    const wrapper = mount(ResizableSplit, { slots: { source: "source", preview: "preview" } });

    await wrapper.get('[data-resize="content"]').trigger("dblclick");

    expect(layout.splitRatio).toBe(0.5);
    expect(wrapper.get('[data-pane="source"]').attributes("style")).toContain("min-width: 240px");
    expect(wrapper.get('[data-pane="preview"]').attributes("style")).toContain("min-width: 240px");
  });
});
