<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IconAbc,
  IconChevronDown,
  IconLetterCase,
  IconRegex,
  IconReplace,
  IconSearch,
  IconX,
} from "@tabler/icons-vue";
import { extractTitle } from "@/services/book/extract-title";
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
import { Input } from "@/components/ui/input";
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
    title: chapterTitle(chapterId),
  }));
});
/** Named as the explorer names the chapter, so a blank first line still yields a title. */
function chapterTitle(chapterId: string): string {
  const chapters = project.book?.chapters ?? [];
  const index = chapters.findIndex((chapter) => chapter.id === chapterId);
  return (
    (index >= 0 && extractTitle(chapters[index]!.source)) ||
    t("chapters.fallback", "Chapter {number}", { number: index + 1 }).replace(
      "{number}",
      String(index + 1),
    )
  );
}
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
  <section class="search-view flex flex-col gap-2 p-2" :aria-label="t('activity.search', 'Search')">
    <!-- `search-view` is the hook use-shortcuts.ts looks for so that
         Ctrl+Alt+Enter replaces all from inside this panel's inputs. -->
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <IconSearch class="size-4 text-muted-foreground" aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        v-model="text"
        type="search"
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
    <Input
      v-model="replacement"
      v-show="replacementOpen"
      type="text"
      :aria-label="t('search.replacePlaceholder', 'Replace')"
      :placeholder="t('search.replacePlaceholder', 'Replace')"
    />
    <p v-if="error" class="text-sm text-destructive" role="alert">
      {{ t(error.error, "Invalid regular expression") }}
    </p>
    <p v-else class="text-xs text-muted-foreground">
      {{
        t("search.summary", "{results} results in {chapters} chapters", {
          results: resultCount,
          chapters: chapterCount,
        })
          .replace("{results}", String(resultCount))
          .replace("{chapters}", String(chapterCount))
      }}
    </p>
    <Button
      v-if="replacementOpen"
      type="button"
      variant="secondary"
      size="sm"
      :disabled="!includedResults.length"
      @click="replaceAll"
    >
      {{ t("search.replaceAll", "Replace all") }}
    </Button>
    <template v-for="group in groups" :key="group.chapterId">
      <Collapsible
        v-if="!hiddenGroups.has(group.chapterId)"
        role="group"
        :aria-label="group.title"
        :open="!collapsedGroups.has(group.chapterId)"
        @update:open="setGroupOpen(group.chapterId, $event)"
      >
        <header class="flex items-center gap-1">
          <CollapsibleTrigger
            class="flex min-w-0 flex-1 items-center truncate rounded-md px-1 text-left text-xs font-medium hover:bg-muted"
          >
            <span class="truncate">{{ group.title }}</span>
          </CollapsibleTrigger>
          <Badge variant="secondary">{{ group.results.length }}</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="t('search.hide', 'Hide')"
            @click="hideGroup(group.chapterId)"
          >
            <IconX aria-hidden="true" />
          </Button>
          <!-- An icon, like the rows' replace: a text button here squeezed the
               chapter title down to an ellipsis at the default sidebar width. -->
          <Button
            v-if="replacementOpen"
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="t('search.replaceChapter', 'Replace chapter')"
            :title="t('search.replaceChapter', 'Replace chapter')"
            @click="replaceChapter(group.chapterId)"
          >
            <IconReplace aria-hidden="true" />
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
