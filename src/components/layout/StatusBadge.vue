<script setup lang="ts">
import { Badge } from "@/components/ui/badge";

defineProps<{ label: string; tone?: "default" | "warning" }>();
</script>

<template>
  <Badge :variant="tone === 'warning' ? 'destructive' : 'secondary'">{{ label }}</Badge>
</template>
