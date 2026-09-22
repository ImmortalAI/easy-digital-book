<script setup lang="ts">
import { computed, ref } from "vue";
import { useDocumentVisibility, useWindowFocus } from "@vueuse/core";
import type { Notification } from "@/stores/notifications";

const props = defineProps<{ notification: Notification }>();
const emit = defineEmits<{ close: []; undo: [] }>();
const hovered = ref(false);
const isVisible = useDocumentVisibility();
const isFocused = useWindowFocus();
const paused = computed(() => hovered.value || isVisible.value !== "visible" || !isFocused.value);
</script>

<template>
  <article
    class="undo-toast"
    role="status"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <span>{{ props.notification.message }}</span>
    <button
      v-if="props.notification.undo"
      type="button"
      :disabled="!props.notification.undoEnabled"
      @click="emit('undo')"
    >
      Undo
    </button>
    <button type="button" aria-label="Close" @click="emit('close')">×</button>
    <span
      class="undo-progress"
      :class="{ 'is-paused': paused }"
      :style="{ animationDuration: `${Math.max(0, props.notification.expiresAt - Date.now())}ms` }"
      @animationend="emit('close')"
    />
  </article>
</template>

<style scoped>
.undo-toast {
  position: relative;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem;
  overflow: hidden;
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  background: canvas;
}
.undo-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  transform-origin: left;
  background: currentColor;
  animation: undo-progress linear forwards;
}
.undo-progress.is-paused {
  animation-play-state: paused;
}
@keyframes undo-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .undo-progress {
    animation-duration: 8s !important;
    transition: opacity 8s linear;
  }
}
</style>
