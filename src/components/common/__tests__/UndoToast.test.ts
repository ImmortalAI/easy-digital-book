import { defineComponent, h, nextTick } from "vue";
import { cleanup, render as renderComponent, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import UndoToast from "@/components/common/UndoToast.vue";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import type { Notification } from "@/stores/notifications";

const notification: Notification = { id: 1, message: "Removed", undo: () => {}, undoEnabled: true };

/**
 * UndoToast is a ToastRoot, which needs a ToastProvider above it and a
 * ToastViewport to teleport into (the viewport also owns the pause). The
 * harness re-emits the toast's events so `emitted()` reads them.
 */
const Harness = defineComponent({
  props: { notification: { type: Object, required: true } },
  emits: ["close", "undo"],
  setup:
    (props, { emit }) =>
    () =>
      h(ToastProvider, null, {
        default: () => [
          h(ToastViewport),
          h(UndoToast, {
            notification: props.notification as Notification,
            onClose: () => emit("close"),
            onUndo: () => emit("undo"),
          }),
        ],
      }),
});

/** The toast teleports into the viewport once the viewport has mounted. */
async function render(
  _component: typeof UndoToast,
  options: { props: { notification: Notification } },
) {
  const result = renderComponent(Harness, options);
  await nextTick();
  return result;
}

describe("UndoToast", () => {
  afterEach(() => {
    window.dispatchEvent(new Event("focus"));
    cleanup();
  });

  it("pauses the countdown when the window loses focus", async () => {
    await render(UndoToast, { props: { notification } });
    const bar = screen.getByTestId("undo-progress");
    expect(bar).not.toHaveAttribute("data-paused");
    window.dispatchEvent(new Event("blur"));
    await nextTick();
    expect(bar).toHaveAttribute("data-paused", "true");
  });

  it("resumes the countdown when the window regains focus", async () => {
    await render(UndoToast, { props: { notification } });
    const bar = screen.getByTestId("undo-progress");
    window.dispatchEvent(new Event("blur"));
    await nextTick();
    window.dispatchEvent(new Event("focus"));
    await nextTick();
    expect(bar).not.toHaveAttribute("data-paused");
  });

  it("keeps undo reachable by its accessible name", async () => {
    const { emitted } = await render(UndoToast, { props: { notification } });
    await userEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(emitted().undo).toHaveLength(1);
  });

  it("closes from its close button once the toast has left", async () => {
    const { emitted } = await render(UndoToast, { props: { notification } });
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    await nextTick();
    expect(emitted().close).toHaveLength(1);
    expect(screen.queryByTestId("undo-progress")).not.toBeInTheDocument();
  });

  it("disables undo while the notification says it cannot be undone", async () => {
    await render(UndoToast, { props: { notification: { ...notification, undoEnabled: false } } });
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });

  it("hands the notification's lifetime to the progress bar", async () => {
    await render(UndoToast, { props: { notification: { ...notification, duration: 3000 } } });
    expect(screen.getByTestId("undo-progress")).toHaveStyle({ animationDuration: "3000ms" });
  });
});
