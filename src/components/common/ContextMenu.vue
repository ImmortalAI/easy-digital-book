<script setup lang="ts">
defineProps<{ items: Array<{ label: string; value: string; disabled?: boolean }> }>();
const emit = defineEmits<{ select: [value: string]; close: [] }>();
</script>
<template>
  <div class="context-menu" role="menu" @mouseleave="emit('close')">
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
