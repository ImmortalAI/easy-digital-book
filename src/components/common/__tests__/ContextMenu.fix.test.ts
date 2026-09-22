import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ContextMenu from "@/components/common/ContextMenu.vue";

describe("ContextMenu review contracts", () => {
  it("dismisses on Escape and outside click", async () => {
    const wrapper = mount(ContextMenu, {
      props: { items: [{ label: "Delete", value: "delete" }] },
      attachTo: document.body,
    });
    await wrapper.trigger("keydown", { key: "Escape" });
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(wrapper.emitted("close")).toHaveLength(2);
    wrapper.unmount();
  });
});
