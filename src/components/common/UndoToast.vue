<script setup lang="ts">
import { computed, ref } from "vue";
import { useDocumentVisibility, useWindowFocus } from "@vueuse/core";
import type { Notification } from "@/stores/notifications";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const props = defineProps<{ notification: Notification }>();
const emit = defineEmits<{ close: []; undo: [] }>();
const hovered = ref(false);
const isVisible = useDocumentVisibility();
const isFocused = useWindowFocus();
const { t } = useSafeI18n();
const paused = computed(() => hovered.value || isVisible.value !== "visible" || !isFocused.value);
</script>

<template>
  <article
    class="undo-toast undo-toast--enter"
    role="status"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <span>{{ props.notification.message }}</span>
    <button
      v-if="props.notification.undo"
      data-undo
      type="button"
      :disabled="!props.notification.undoEnabled"
      @click="emit('undo')"
    >
      {{ t("common.undo", "Undo") }}
    </button>
    <button type="button" :aria-label="t('common.close', 'Close')" @click="emit('close')">×</button>
    <span
      class="undo-progress"
      :class="{ 'is-paused': paused }"
      :style="{ animationDuration: `${props.notification.duration ?? 8000}ms` }"
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
  animation: toast-enter 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
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
@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(0.5rem) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes toast-exit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(0.5rem) scale(0.96);
  }
}
.undo-toast--exit {
  animation: toast-exit 160ms cubic-bezier(0.36, 0, 0.66, -0.56) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .undo-toast,
  .undo-toast--exit {
    animation: fade-toast 160ms ease-out;
  }
  .undo-progress {
    animation-duration: 8s !important;
    transition: opacity 8s linear;
  }
}
@keyframes fade-toast {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
