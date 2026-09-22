<script setup lang="ts">
import { computed, ref } from "vue";
import { findInBook } from "@/services/search/find";
import type { SearchQuery, SearchResult } from "@/services/search/query";
import { useLayoutStore } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";
import { useBookSearch } from "@/composables/use-book-search";
import SearchResultItem from "./SearchResultItem.vue";

const project = useProjectStore();
const layout = useLayoutStore();
const search = useBookSearch();
const text = ref("");
const replacement = ref("");
const caseSensitive = ref(false);
const wholeWord = ref(false);
const regex = ref(false);
const query = computed<SearchQuery>(() => ({
  text: text.value,
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
  regex: regex.value,
}));
const results = computed(() => {
  if (!project.book || !text.value) return [];
  const found = findInBook(project.book, query.value);
  return "error" in found ? [] : found;
});
function select(chapterId: string, from: number) {
  layout.center = { kind: "chapter", id: chapterId };
  void from;
}
function replaceOne(result: SearchResult) {
  search.replaceOne(result, replacement.value);
}
function replaceAll() {
  search.replaceAll(query.value, replacement.value);
}
</script>
<template>
  <section class="search-view" aria-label="Search">
    <input v-model="text" type="search" placeholder="Search" autofocus />
    <input v-model="replacement" type="text" placeholder="Replace" />
    <label><input v-model="caseSensitive" type="checkbox" /> Aa</label>
    <label><input v-model="wholeWord" type="checkbox" /> Whole word</label>
    <label><input v-model="regex" type="checkbox" /> Regex</label>
    <button type="button" :disabled="!results.length" @click="replaceAll">Replace all</button>
    <p>{{ results.length }} results</p>
    <SearchResultItem
      v-for="result in results"
      :key="`${result.chapterId}:${result.from}`"
      :result="result"
      :chapter-title="
        project.book?.chapters
          .find((chapter) => chapter.id === result.chapterId)
          ?.source.split('\n')[0] ?? result.chapterId
      "
      @select="select(result.chapterId, result.from)"
      @replace="replaceOne(result)"
    />
  </section>
</template>
