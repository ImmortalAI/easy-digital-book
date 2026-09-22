import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UndoToast from "@/components/common/UndoToast.vue";

describe("UndoToast", () => {
  it("removes itself when the lifetime animation ends", async () => {
    const wrapper = mount(UndoToast, {
      props: {
        notification: { id: 1, message: "Removed", expiresAt: Date.now() + 8000 },
      },
    });

    await wrapper.get(".undo-progress").trigger("animationend");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("pauses while hovered", async () => {
    const wrapper = mount(UndoToast, {
      props: {
        notification: { id: 1, message: "Removed", expiresAt: Date.now() + 8000 },
      },
    });

    await wrapper.trigger("mouseenter");
    expect(wrapper.get(".undo-progress").classes()).toContain("is-paused");
  });
});
