<script setup lang="ts">
import { computed, ref } from "vue";
import { findInBook } from "@/services/search/find";
import { replaceMatches } from "@/services/search/replace";
import type { SearchError, SearchQuery, SearchResult } from "@/services/search/query";
import { useLayoutStore } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";
import { useBookSearch } from "@/composables/use-book-search";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import SearchResultItem from "./SearchResultItem.vue";

const emit = defineEmits<{ select: [chapterId: string, from: number, to: number] }>();
const project = useProjectStore();
const layout = useLayoutStore();
const search = useBookSearch();
const { t } = useSafeI18n();
const text = ref("");
const replacement = ref("");
const replacementOpen = ref(false);
const caseSensitive = ref(false);
const wholeWord = ref(false);
const regex = ref(false);
const collapsedGroups = ref(new Set<string>());
const hiddenGroups = ref(new Set<string>());
const hiddenResults = ref(new Set<string>());
const query = computed<SearchQuery>(() => ({
  text: text.value,
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
  regex: regex.value,
}));

const outcome = computed<SearchResult[] | SearchError>(() => {
  if (!project.book || !text.value) return [];
  if (replacement.value) {
    const found = replaceMatches(project.book, query.value, replacement.value);
    if ("error" in found) return found;
    return found.changes.flatMap((change) => change.matches);
  }
  return findInBook(project.book, query.value);
});
const error = computed(() => ("error" in outcome.value ? outcome.value : null));
const allResults = computed(() => (Array.isArray(outcome.value) ? outcome.value : []));
const groups = computed(() => {
  const grouped = new Map<string, SearchResult[]>();
  for (const result of allResults.value) {
    const values = grouped.get(result.chapterId) ?? [];
    values.push(result);
    grouped.set(result.chapterId, values);
  }
  return [...grouped].map(([chapterId, results]) => ({
    chapterId,
    results,
    title:
      project.book?.chapters.find((chapter) => chapter.id === chapterId)?.source.split("\n")[0] ??
      chapterId,
  }));
});
const visibleResults = computed(() =>
  groups.value.flatMap((group) =>
    hiddenGroups.value.has(group.chapterId) || collapsedGroups.value.has(group.chapterId)
      ? []
      : group.results.filter((result) => !hiddenResults.value.has(resultKey(result))),
  ),
);
const resultCount = computed(() => allResults.value.length);
const chapterCount = computed(() => groups.value.length);

function resultKey(result: SearchResult): string {
  return `${result.chapterId}:${result.from}:${result.to}`;
}
function selectResult(result: SearchResult) {
  layout.center = { kind: "chapter", id: result.chapterId };
  emit("select", result.chapterId, result.from, result.to);
}
function replaceOne(result: SearchResult) {
  search.replaceOne(query.value, result, replacement.value);
}
function replaceChapter(chapterId: string) {
  search.replaceChapter(chapterId, query.value, replacement.value);
}
function replaceAll() {
  search.replaceAll(query.value, replacement.value);
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && event.altKey && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    replaceAll();
  }
}
function toggleGroup(chapterId: string) {
  const next = new Set(collapsedGroups.value);
  if (next.has(chapterId)) next.delete(chapterId);
  else next.add(chapterId);
  collapsedGroups.value = next;
}
function hideGroup(chapterId: string) {
  const next = new Set(hiddenGroups.value);
  next.add(chapterId);
  hiddenGroups.value = next;
}
function hideResult(result: SearchResult) {
  const next = new Set(hiddenResults.value);
  next.add(resultKey(result));
  hiddenResults.value = next;
}
</script>

<template>
  <section class="search-view" aria-label="Search" @keydown="onKeydown">
    <div class="search-view__query">
      <input
        v-model="text"
        type="search"
        data-search-input
        :placeholder="t('search.placeholder', 'Search')"
        autofocus
      />
      <button
        type="button"
        data-replace-toggle
        :aria-pressed="replacementOpen"
        @click="replacementOpen = !replacementOpen"
      >
        ⌄
      </button>
    </div>
    <input
      v-model="replacement"
      type="text"
      data-replace-input
      :aria-hidden="!replacementOpen"
      :placeholder="t('search.replacePlaceholder', 'Replace')"
    />
    <div class="search-view__options">
      <label
        ><input v-model="caseSensitive" type="checkbox" data-search-option="case" />
        {{ t("search.caseSensitive", "Aa") }}</label
      >
      <label
        ><input v-model="wholeWord" type="checkbox" data-search-option="whole-word" />
        {{ t("search.wholeWord", "Whole word") }}</label
      >
      <label
        ><input v-model="regex" type="checkbox" data-search-option="regex" />
        {{ t("search.regex", ".*") }}</label
      >
    </div>
    <p v-if="error" class="search-error" role="alert">
      {{ t(error.error, "Invalid regular expression") }}
    </p>
    <p v-else data-search-summary>
      {{
        t("search.summary", "{results} results in {chapters} chapters")
          .replace("{results}", String(resultCount))
          .replace("{chapters}", String(chapterCount))
      }}
    </p>
    <button
      v-if="replacementOpen"
      type="button"
      data-replace-all
      :disabled="!visibleResults.length"
      @click="replaceAll"
    >
      {{ t("search.replaceAll", "Replace all") }}
    </button>
    <template v-for="group in groups" :key="group.chapterId">
      <div v-if="!hiddenGroups.has(group.chapterId)" :data-search-group="group.chapterId">
        <header class="search-group__header">
          <button type="button" data-search-collapse @click="toggleGroup(group.chapterId)">
            {{ group.title }}
          </button>
          <span data-search-count>{{ group.results.length }}</span>
          <button type="button" data-search-hide @click="hideGroup(group.chapterId)">
            {{ t("search.hide", "Hide") }}
          </button>
          <button
            v-if="replacementOpen"
            type="button"
            :data-replace-chapter="group.chapterId"
            @click="replaceChapter(group.chapterId)"
          >
            {{ t("search.replaceChapter", "Replace chapter") }}
          </button>
        </header>
        <div v-if="!collapsedGroups.has(group.chapterId)">
          <SearchResultItem
            v-for="result in group.results.filter((item) => !hiddenResults.has(resultKey(item)))"
            :key="resultKey(result)"
            :result="result"
            :chapter-title="group.title"
            :replacement-visible="replacementOpen"
            @select="selectResult(result)"
            @replace="replaceOne(result)"
            @hide="hideResult(result)"
          />
        </div>
      </div>
    </template>
  </section>
</template>
