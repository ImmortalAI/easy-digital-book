import { mount } from "@vue/test-utils";
import { describe, expect, it, afterEach } from "vitest";
import { nextTick } from "vue";
import UndoToast from "@/components/common/UndoToast.vue";

describe("UndoToast", () => {
  afterEach(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    window.dispatchEvent(new Event("focus"));
  });
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
    expect(wrapper.get(".undo-progress").attributes("style")).toContain(
      "animation-duration: 8000ms",
    );
  });

  it("uses enter/exit motion classes and a fixed duration that does not reset while paused", async () => {
    const wrapper = mount(UndoToast, {
      props: {
        notification: { id: 1, message: "Removed", expiresAt: Date.now() + 8000, duration: 8000 },
      },
    });
    expect(wrapper.classes()).toContain("undo-toast--enter");
    await wrapper.get(".undo-progress").trigger("animationend");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("pauses when the document is hidden or the window loses focus", async () => {
    const wrapper = mount(UndoToast, {
      props: { notification: { id: 1, message: "Removed", expiresAt: Date.now() + 8000 } },
    });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await nextTick();
    expect(wrapper.get(".undo-progress").classes()).toContain("is-paused");
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("blur"));
    await nextTick();
    expect(wrapper.get(".undo-progress").classes()).toContain("is-paused");
    wrapper.unmount();
  });
});
