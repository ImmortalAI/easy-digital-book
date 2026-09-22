import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import { useLayoutStore } from "@/stores/layout";

describe("AppToolbar", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("switches modes and disables them outside chapter and css views", async () => {
    const layout = useLayoutStore();
    const wrapper = mount(AppToolbar);
    await wrapper.get('[data-mode="text"]').trigger("click");
    expect(layout.mode).toBe("text");

    layout.center = { kind: "metadata" };
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-mode="text"]').attributes("disabled")).toBeDefined();
  });
});
