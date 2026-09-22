<script setup lang="ts">
defineProps<{ active: "explorer" | "search" | "settings" }>();
const emit = defineEmits<{ select: [value: "explorer" | "search" | "settings"] }>();
</script>
<template>
  <nav class="editor-activity" aria-label="Activity">
    <button
      v-for="item in ['explorer', 'search'] as const"
      :key="item"
      type="button"
      :data-activity="item"
      :class="{ 'is-active': active === item }"
      :aria-pressed="active === item"
      :aria-label="item === 'explorer' ? 'Explorer' : 'Search'"
      @click="emit('select', item)"
    >
      {{ item === "explorer" ? "📄" : "⌕" }}
    </button>
    <button
      data-activity="settings"
      class="editor-activity__settings"
      type="button"
      :class="{ 'is-active': active === 'settings' }"
      :aria-pressed="active === 'settings'"
      aria-label="Settings"
      @click="emit('select', 'settings')"
    >
      ⚙
    </button>
  </nav>
</template>
