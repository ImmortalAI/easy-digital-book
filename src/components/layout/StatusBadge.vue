<script setup lang="ts">
defineProps<{ label: string; tone?: "default" | "warning" }>();
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone ?? 'default'}`">{{ label }}</span>
</template>
