import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";

describe("ConfirmDialog review contracts", () => {
  it("focuses the destructive action, supports the ask-again choice, and cancels on Escape", async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { open: true, title: "Delete", message: "Details", showAskAgain: true },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    expect(document.activeElement?.textContent).toContain("Delete");
    await wrapper.get('input[type="checkbox"]').setValue(false);
    await wrapper.get("section").trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("cancel")).toHaveLength(1);
    wrapper.unmount();
  });
});
