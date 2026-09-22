<script setup lang="ts">
import { computed } from "vue";
import { extractTitle } from "@/services/book/extract-title";
import { useLayoutStore } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const project = useProjectStore();
const layout = useLayoutStore();
const { t } = useSafeI18n();
const label = computed(() => {
  const center = layout.center;
  if (center.kind === "metadata") return t("breadcrumbs.metadata", "Metadata");
  if (center.kind === "css") return "custom.css";
  if (center.kind === "image") return center.path;
  if (center.kind === "settings") return t("breadcrumbs.settings", "Settings");
  const index = project.book?.chapters.findIndex((chapter) => chapter.id === center.id) ?? -1;
  const chapter = project.book?.chapters[index];
  if (!chapter) return t("breadcrumbs.chapters", "Chapters");
  const fallback = t("breadcrumbs.fallback", "Chapter {number}").replace(
    "{number}",
    String(index + 1),
  );
  return `${t("breadcrumbs.chapters", "Chapters")} › ${index + 1} ${extractTitle(chapter.source) || fallback}`;
});
</script>

<template>
  <div class="breadcrumbs" :aria-label="t('breadcrumbs.aria', 'Breadcrumbs')">{{ label }}</div>
</template>
