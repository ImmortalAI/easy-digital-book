<script setup lang="ts">
import { computed } from "vue";
import { extractTitle } from "@/services/book/extract-title";
import { useLayoutStore } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";

const project = useProjectStore();
const layout = useLayoutStore();
const label = computed(() => {
  const center = layout.center;
  if (center.kind === "metadata") return "Метаданные";
  if (center.kind === "css") return "custom.css";
  if (center.kind === "image") return center.path;
  if (center.kind === "settings") return "Настройки";
  const index = project.book?.chapters.findIndex((chapter) => chapter.id === center.id) ?? -1;
  const chapter = project.book?.chapters[index];
  if (!chapter) return "Главы";
  return `Главы › ${index + 1} ${extractTitle(chapter.source) || `Глава ${index + 1}`}`;
});
</script>

<template>
  <div class="breadcrumbs" aria-label="Breadcrumbs">{{ label }}</div>
</template>
