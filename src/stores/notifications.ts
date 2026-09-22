import { defineStore } from "pinia";
import { shallowRef } from "vue";

export interface NotificationInput {
  message: string;
  kind?: "info" | "success" | "warning" | "error";
  duration?: number;
  undo?: () => void;
  expiresAt?: number;
  undoEnabled?: boolean;
  undoState?: () => boolean;
}
export interface Notification extends NotificationInput {
  id: number;
  expiresAt: number;
  undoEnabled?: boolean;
}
export const useNotificationsStore = defineStore("notifications", () => {
  const items = shallowRef<Notification[]>([]);
  let nextId = 1;
  function add(input: NotificationInput) {
    const duration = input.duration ?? 8000;
    const item = {
      ...input,
      id: nextId++,
      expiresAt: input.expiresAt ?? Date.now() + duration,
      undoEnabled: input.undoEnabled ?? Boolean(input.undo),
    };
    if (input.undoState) {
      Object.defineProperty(item, "undoEnabled", { enumerable: true, get: input.undoState });
    }
    items.value = [...items.value, item];
    if (items.value.length > 3) items.value = items.value.slice(-3);
    return items.value[items.value.length - 1]!.id;
  }
  function remove(id: number) {
    items.value = items.value.filter((item) => item.id !== id);
  }
  function clear() {
    items.value = [];
  }
  return { items, add, remove, dismiss: remove, clear };
});
