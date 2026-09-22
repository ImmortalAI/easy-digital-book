<script setup lang="ts">
import { computed, ref } from "vue";
import { checkBook } from "@/services/checks/book-checks";
import { useDiagnosticsStore } from "@/stores/diagnostics";
import { useProjectStore } from "@/stores/project";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const props = defineProps<{ chapterId?: string }>();
const emit = defineEmits<{
  select: [item: { chapterId?: string; position?: { line: number; column: number } }];
}>();
const diagnostics = useDiagnosticsStore();
const project = useProjectStore();
const { t } = useSafeI18n();
const open = ref(false);
const chapterItems = computed(() =>
  props.chapterId ? (diagnostics.parse.get(props.chapterId) ?? []) : [],
);
const bookItems = computed(() => {
  const items = [
    ...diagnostics.book,
    ...diagnostics.read,
    ...(project.book ? checkBook(project.book) : []),
  ];
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.code}|${item.message}|${item.chapterId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});
const parseCount = computed(() =>
  [...diagnostics.parse.values()].reduce((total, items) => total + items.length, 0),
);
const count = computed(() => parseCount.value + bookItems.value.length);

function select(item: { chapterId?: string; position?: { line: number; column: number } }) {
  emit("select", item);
  open.value = false;
}
</script>

<template>
  <div class="warnings-popover">
    <button
      data-warnings-trigger
      class="status-badge status-badge--warning"
      type="button"
      @click="open = !open"
    >
      ⚠ {{ count }}
    </button>
    <div v-if="open" class="warnings-popover__panel" role="dialog">
      <section>
        <h3>{{ t("warnings.currentChapter", "Current chapter") }}</h3>
        <button
          v-for="(item, index) in chapterItems"
          :key="`chapter-${index}`"
          type="button"
          @click="select(item)"
        >
          {{ item.message }}
        </button>
        <p v-if="chapterItems.length === 0">{{ t("warnings.none", "No warnings") }}</p>
      </section>
      <section>
        <h3>{{ t("warnings.book", "Book") }}</h3>
        <button
          v-for="(item, index) in bookItems"
          :key="`book-${index}`"
          type="button"
          @click="select(item)"
        >
          {{ item.message }}
        </button>
        <p v-if="bookItems.length === 0">{{ t("warnings.none", "No warnings") }}</p>
      </section>
    </div>
  </div>
</template>
