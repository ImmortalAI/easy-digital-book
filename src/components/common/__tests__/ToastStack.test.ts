import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, nextTick } from "vue";
import { cleanup, render, screen, waitFor, within } from "@testing-library/vue";
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
    await renderStack();
    for (const message of ["one", "two", "three", "four"]) {
      notifications.add({ message });
      await nextTick();
    }

    // The oldest closes through the primitive's presence, a few ticks later.
    const region = screen.getByRole("region", { name: /notifications/i });
    await waitFor(() => expect(within(region).getAllByRole("listitem")).toHaveLength(3));
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

  it("stacks what it is given below the toasts instead of overlapping them", async () => {
    const notifications = useNotificationsStore();
    render(
      defineComponent({
        setup: () => () =>
          h(ToastProvider, null, {
            default: () =>
              h(ToastStack, null, { default: () => h("p", "A new version is available") }),
          }),
      }),
    );
    notifications.add({ message: "Chapter deleted" });
    await nextTick();
    await nextTick();

    const region = screen.getByRole("region", { name: /notifications/i });
    const notice = screen.getByText("A new version is available");
    expect(region.parentElement).toBe(notice.parentElement);
    expect(region.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(region).toHaveTextContent("Chapter deleted");
  });
});
