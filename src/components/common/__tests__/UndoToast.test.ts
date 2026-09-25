import { defineComponent, h, nextTick, ref } from "vue";
import { cleanup, render as renderComponent, screen, waitFor } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import UndoToast from "@/components/common/UndoToast.vue";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

  describe("Escape", () => {
    const dialogOpen = ref(false);
    /** A toast that is already showing, then a dialog opened on top of it. */
    const WithDialog = defineComponent({
      emits: ["close"],
      setup:
        (_props, { emit }) =>
        () =>
          h(ToastProvider, null, {
            default: () => [
              h(ToastViewport),
              h(UndoToast, { notification, onClose: () => emit("close") }),
              h(
                Dialog,
                {
                  open: dialogOpen.value,
                  "onUpdate:open": (value: boolean) => (dialogOpen.value = value),
                },
                {
                  default: () =>
                    h(DialogContent, null, {
                      default: () => [
                        h(DialogTitle, null, { default: () => "Delete chapter?" }),
                        h(DialogDescription, null, { default: () => "It can be undone." }),
                      ],
                    }),
                },
              ),
            ],
          }),
    });

    afterEach(() => {
      dialogOpen.value = false;
    });

    it("still closes a dialog opened while a toast is visible, and leaves the toast", async () => {
      const { emitted } = renderComponent(WithDialog);
      await nextTick();
      dialogOpen.value = true;
      await waitFor(() =>
        expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement),
      );

      await userEvent.keyboard("{Escape}");

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.getByTestId("undo-progress")).toBeInTheDocument();
      expect(emitted().close).toBeUndefined();
    });

    it("closes the toast when Escape is pressed inside the notifications", async () => {
      const { emitted } = renderComponent(WithDialog);
      await nextTick();
      screen.getByRole("button", { name: /close/i }).focus();

      await userEvent.keyboard("{Escape}");

      await waitFor(() => expect(emitted().close).toHaveLength(1));
      expect(screen.queryByTestId("undo-progress")).not.toBeInTheDocument();
    });
  });

  it("styles an error apart from an ordinary notification", async () => {
    await render(UndoToast, {
      props: { notification: { id: 2, message: "Autosave failed", kind: "error" } },
    });
    const toast = screen.getByText("Autosave failed").closest('[data-slot="toast"]');
    expect(toast).toHaveClass("text-destructive");
  });

  it("keeps ordinary notifications in the default style", async () => {
    await render(UndoToast, { props: { notification } });
    const toast = screen.getByText("Removed").closest('[data-slot="toast"]');
    expect(toast).not.toHaveClass("text-destructive");
  });
});
