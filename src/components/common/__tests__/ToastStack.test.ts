import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import ToastStack from "@/components/common/ToastStack.vue";
import { useNotificationsStore } from "@/stores/notifications";

describe("ToastStack", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("renders at most three queued notifications", () => {
    const notifications = useNotificationsStore();
    notifications.add({ message: "one" });
    notifications.add({ message: "two" });
    notifications.add({ message: "three" });
    notifications.add({ message: "four" });

    const wrapper = mount(ToastStack);
    expect(wrapper.findAll("[data-toast]")).toHaveLength(3);
  });
});
