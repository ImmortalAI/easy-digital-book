<script setup lang="ts">
import UndoToast from "./UndoToast.vue";
import { useNotificationsStore } from "@/stores/notifications";
const notifications = useNotificationsStore();
</script>
<template>
  <div class="toast-stack" aria-live="polite">
    <TransitionGroup name="toast" tag="div">
      <UndoToast
        v-for="notification in notifications.items"
        :key="notification.id"
        data-toast
        :notification="notification"
        @close="notifications.remove(notification.id)"
        @undo="
          notification.undo?.();
          notifications.remove(notification.id);
        "
      />
    </TransitionGroup>
  </div>
</template>
