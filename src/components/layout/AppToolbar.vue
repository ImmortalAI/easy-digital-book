<script setup lang="ts">
import { computed } from "vue";
import { useLayoutStore, type LayoutMode } from "@/stores/layout";

const layout = useLayoutStore();
const modes: Array<{ value: LayoutMode; label: string; shortcut: string }> = [
  { value: "text", label: "Текст", shortcut: "1" },
  { value: "split", label: "Сплит", shortcut: "2" },
  { value: "preview", label: "Превью", shortcut: "3" },
];
const disabled = computed(() => !["chapter", "css"].includes(layout.center.kind));

function setMode(mode: LayoutMode) {
  if (disabled.value) return;
  layout.mode = mode;
  void layout.persist();
}
</script>

<template>
  <div class="app-toolbar" role="toolbar" aria-label="Editor mode">
    <div class="app-toolbar__modes" role="group" aria-label="Preview mode">
      <button
        v-for="item in modes"
        :key="item.value"
        :data-mode="item.value"
        class="app-toolbar__mode"
        :class="{ 'is-active': layout.mode === item.value }"
        type="button"
        :disabled="disabled"
        :aria-pressed="layout.mode === item.value"
        @click="setMode(item.value)"
      >
        {{ item.label }}
        <kbd>Mod+{{ item.shortcut }}</kbd>
      </button>
    </div>
    <slot />
  </div>
</template>
