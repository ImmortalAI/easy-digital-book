<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps<{
  items: Array<{ label: string; value: string; disabled?: boolean }>;
  x?: number;
  y?: number;
}>();
const emit = defineEmits<{ select: [value: string]; close: [] }>();
const menu = ref<HTMLElement>();
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
  }
}
function onPointerdown(event: MouseEvent) {
  if (menu.value && !menu.value.contains(event.target as Node)) emit("close");
}
onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("mousedown", onPointerdown);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("mousedown", onPointerdown);
});
</script>
<template>
  <div
    ref="menu"
    class="context-menu"
    role="menu"
    :style="{ left: `${x ?? 0}px`, top: `${y ?? 0}px` }"
  >
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="menuitem"
      :disabled="item.disabled"
      @click="emit('select', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
