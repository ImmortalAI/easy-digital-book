<script setup lang="ts">
defineProps<{ title: string; count?: number; collapsed?: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
</script>
<template>
  <section class="explorer-section">
    <div class="explorer-section__title">
      <button type="button" @click="emit('toggle')">
        {{ collapsed ? "▸" : "▾" }} {{ title }} <span v-if="count !== undefined">{{ count }}</span>
      </button>
      <span class="explorer-section__action"><slot name="action" /></span>
    </div>
    <div v-if="!collapsed" class="explorer-section__body"><slot /></div>
  </section>
</template>
