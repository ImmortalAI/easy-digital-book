import { defineStore } from "pinia";
import { ref } from "vue";

export interface NotificationInput {
  message: string;
  kind?: "info" | "success" | "warning" | "error";
  duration?: number;
}
export interface Notification extends NotificationInput {
  id: number;
}
export const useNotificationsStore = defineStore("notifications", () => {
  const items = ref<Notification[]>([]);
  let nextId = 1;
  function add(input: NotificationInput) {
    items.value.push({ ...input, id: nextId++ });
    if (items.value.length > 3) items.value.splice(0, items.value.length - 3);
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
