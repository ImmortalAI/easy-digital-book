<script setup lang="ts">
import UndoToast from "./UndoToast.vue";
import { useNotificationsStore } from "@/stores/notifications";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { ToastViewport } from "@/components/ui/toast";

// Base specification §9.5: no more than three notifications; the fourth
// closes the oldest (with its exit animation, so it is closed, not dropped).
const STACK_LIMIT = 3;

const notifications = useNotificationsStore();
const { t } = useSafeI18n();

function viewportLabel(hotkey: string) {
  return t("notifications.region", `Notifications (${hotkey})`, { hotkey });
}
</script>

<template>
  <UndoToast
    v-for="(notification, index) in notifications.items"
    :key="notification.id"
    data-toast
    :notification="notification"
    :superseded="index < notifications.items.length - STACK_LIMIT"
    @close="notifications.remove(notification.id)"
    @undo="notification.undo?.()"
  />
  <!-- One bottom-right column: the toasts, then whatever App parks in the same
       corner (the update notice), so the two never overlap. -->
  <div class="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
    <ToastViewport :label="viewportLabel" class="static" />
    <slot />
  </div>
</template>
