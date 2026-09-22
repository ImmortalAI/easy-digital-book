<script setup lang="ts">
defineProps<{ title: string; count?: number; collapsed?: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
</script>
<template>
  <section class="explorer-section">
    <button class="explorer-section__title" type="button" @click="emit('toggle')">
      {{ collapsed ? "▸" : "▾" }} {{ title }} <span v-if="count !== undefined">{{ count }}</span
      ><slot name="action" />
    </button>
    <div v-if="!collapsed" class="explorer-section__body"><slot /></div>
  </section>
</template>
