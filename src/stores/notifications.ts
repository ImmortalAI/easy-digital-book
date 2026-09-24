import { defineStore } from "pinia";
import { shallowRef } from "vue";

export interface NotificationInput {
  message: string;
  kind?: "info" | "success" | "warning" | "error";
  /** Lifetime in ms, handed to the toast primitive; the provider's 8 s applies when absent. */
  duration?: number;
  undo?: () => void;
  undoEnabled?: boolean;
  undoState?: () => boolean;
}
export interface Notification extends NotificationInput {
  id: number;
  undoEnabled?: boolean;
}
// The list of notifications and their undo actions. Lifetime, pause and the
// three-toast limit belong to the toast primitive and `ToastStack`.
export const useNotificationsStore = defineStore("notifications", () => {
  const items = shallowRef<Notification[]>([]);
  let nextId = 1;
  function add(input: NotificationInput) {
    const item = {
      ...input,
      id: nextId++,
      undoEnabled: input.undoEnabled ?? Boolean(input.undo),
    };
    if (input.undoState) {
      Object.defineProperty(item, "undoEnabled", { enumerable: true, get: input.undoState });
    }
    items.value = [...items.value, item];
    return item.id;
  }
  function remove(id: number) {
    items.value = items.value.filter((item) => item.id !== id);
  }
  function clear() {
    items.value = [];
  }
  return { items, add, remove, dismiss: remove, clear };
});
