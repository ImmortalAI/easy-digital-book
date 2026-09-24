import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, nextTick } from "vue";
import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ToastStack from "@/components/common/ToastStack.vue";
import { ToastProvider } from "@/components/ui/toast";
import { useNotificationsStore } from "@/stores/notifications";

/** App.vue provides the ToastProvider the stack's viewport and toasts need. */
const InProvider = defineComponent({
  setup: () => () => h(ToastProvider, null, { default: () => h(ToastStack) }),
});

async function renderStack() {
  const result = render(InProvider);
  await nextTick();
  return result;
}

describe("ToastStack", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => cleanup());

  it("renders at most three notifications and closes the oldest", async () => {
    const notifications = useNotificationsStore();
    const { container } = await renderStack();
    for (const message of ["one", "two", "three", "four"]) {
      notifications.add({ message });
      await nextTick();
    }

    // The oldest closes through the primitive's presence, a few ticks later.
    await waitFor(() => expect(container.querySelectorAll("[data-toast]")).toHaveLength(3));
    expect(screen.queryByText("one")).not.toBeInTheDocument();
    expect(notifications.items.map((item) => item.message)).toEqual(["two", "three", "four"]);
  });

  it("lives in a notifications region", async () => {
    await renderStack();
    expect(screen.getByRole("region", { name: /notifications/i })).toBeInTheDocument();
  });

  it("runs the undo action and removes the notification", async () => {
    const notifications = useNotificationsStore();
    const undo = vi.fn<() => void>();
    await renderStack();
    notifications.add({ message: "Chapter deleted", undo });
    await nextTick();
    await nextTick();

    await userEvent.click(screen.getByRole("button", { name: /undo/i }));
    await nextTick();

    expect(undo).toHaveBeenCalledOnce();
    expect(notifications.items).toHaveLength(0);
  });
});
