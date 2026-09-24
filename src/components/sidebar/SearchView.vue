<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IconAbc,
  IconChevronDown,
  IconLetterCase,
  IconRegex,
  IconSearch,
  IconX,
} from "@tabler/icons-vue";
import { findInBook } from "@/services/search/find";
import { replaceMatches } from "@/services/search/replace";
import type { SearchError, SearchQuery, SearchResult } from "@/services/search/query";
import { useLayoutStore } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";
import { useBookSearch } from "@/composables/use-book-search";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { useShortcuts } from "@/composables/use-shortcuts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

/** The query-row toggles as one `multiple` ToggleGroup selection. */
const activeOptions = computed<string[]>({
  get: () => [
    ...(caseSensitive.value ? ["case"] : []),
    ...(wholeWord.value ? ["whole-word"] : []),
    ...(regex.value ? ["regex"] : []),
  ],
  set: (values) => {
    caseSensitive.value = values.includes("case");
    wholeWord.value = values.includes("whole-word");
    regex.value = values.includes("regex");
  },
});

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
/**
 * What a replace acts on. Hiding is the user excluding a match; collapsing is
 * only a fold, so a collapsed group is still replaced and still counts towards
 * whether Replace all is available.
 */
const includedResults = computed(() =>
  groups.value.flatMap((group) =>
    hiddenGroups.value.has(group.chapterId)
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
  const included = new Set(includedResults.value.map(resultKey));
  search.replaceAll(query.value, replacement.value, (chapterId, match) =>
    included.has(`${chapterId}:${match.from}:${match.to}`),
  );
}
useShortcuts({ replaceAll });
function setGroupOpen(chapterId: string, open: boolean) {
  const next = new Set(collapsedGroups.value);
  if (open) next.delete(chapterId);
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
  <section class="search-view flex flex-col gap-2 p-2" aria-label="Search">
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <IconSearch class="size-4 text-muted-foreground" aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        v-model="text"
        type="search"
        data-search-input
        :aria-label="t('search.placeholder', 'Search')"
        :placeholder="t('search.placeholder', 'Search')"
        autofocus
      />
      <InputGroupAddon align="inline-end" class="gap-1">
        <ToggleGroup v-model="activeOptions" type="multiple" size="sm">
          <ToggleGroupItem value="case" :aria-label="t('search.matchCase', 'Match case')">
            <IconLetterCase class="size-4" aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="whole-word"
            :aria-label="t('search.wholeWordLabel', 'Whole word')"
          >
            <IconAbc class="size-4" aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem value="regex" :aria-label="t('search.regexLabel', 'Regular expression')">
            <IconRegex class="size-4" aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-replace-toggle
          :aria-expanded="replacementOpen"
          :aria-label="t('search.showReplace', 'Show replace')"
          @click="replacementOpen = !replacementOpen"
        >
          <IconChevronDown
            class="size-4 transition-transform"
            :class="{ 'rotate-180': replacementOpen }"
            aria-hidden="true"
          />
        </Button>
      </InputGroupAddon>
    </InputGroup>
    <input
      v-model="replacement"
      v-show="replacementOpen"
      type="text"
      data-replace-input
      :aria-label="t('search.replacePlaceholder', 'Replace')"
      :placeholder="t('search.replacePlaceholder', 'Replace')"
      class="border-input dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
    />
    <p v-if="error" class="search-error text-sm text-destructive" role="alert">
      {{ t(error.error, "Invalid regular expression") }}
    </p>
    <p v-else data-search-summary class="text-xs text-muted-foreground">
      {{
        t("search.summary", "{results} results in {chapters} chapters")
          .replace("{results}", String(resultCount))
          .replace("{chapters}", String(chapterCount))
      }}
    </p>
    <Button
      v-if="replacementOpen"
      type="button"
      variant="secondary"
      size="sm"
      data-replace-all
      :disabled="!includedResults.length"
      @click="replaceAll"
    >
      {{ t("search.replaceAll", "Replace all") }}
    </Button>
    <template v-for="group in groups" :key="group.chapterId">
      <Collapsible
        v-if="!hiddenGroups.has(group.chapterId)"
        :data-search-group="group.chapterId"
        :open="!collapsedGroups.has(group.chapterId)"
        @update:open="setGroupOpen(group.chapterId, $event)"
      >
        <header class="flex items-center gap-1">
          <CollapsibleTrigger
            class="flex min-w-0 flex-1 items-center truncate rounded-md px-1 text-left text-xs font-medium hover:bg-muted"
          >
            <span class="truncate">{{ group.title }}</span>
          </CollapsibleTrigger>
          <Badge variant="secondary" data-search-count>{{ group.results.length }}</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="t('search.hide', 'Hide')"
            @click="hideGroup(group.chapterId)"
          >
            <IconX aria-hidden="true" />
          </Button>
          <Button
            v-if="replacementOpen"
            type="button"
            variant="ghost"
            size="xs"
            @click="replaceChapter(group.chapterId)"
          >
            {{ t("search.replaceChapter", "Replace chapter") }}
          </Button>
        </header>
        <CollapsibleContent>
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
        </CollapsibleContent>
      </Collapsible>
    </template>
  </section>
</template>
