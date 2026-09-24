<script setup lang="ts">
import type { SearchResult } from "@/services/search/query";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { IconArrowNarrowRight, IconReplace, IconX } from "@tabler/icons-vue";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent } from "@/components/ui/item";
defineProps<{ result: SearchResult; chapterTitle: string; replacementVisible?: boolean }>();
const emit = defineEmits<{ select: []; replace: []; hide: [] }>();
const { t } = useSafeI18n();
</script>
<template>
  <Item class="search-result" size="sm">
    <ItemContent>
      <button
        type="button"
        class="flex min-w-0 flex-col items-start text-left"
        @click="emit('select')"
      >
        <strong class="truncate text-xs font-medium">{{ chapterTitle }}</strong>
        <span class="truncate text-sm">{{ result.matched }}</span>
        <small
          v-if="replacementVisible && result.replacementPreview"
          class="replacement-preview flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
        >
          <IconArrowNarrowRight class="size-3 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ result.replacementPreview }}</span>
        </small>
      </button>
    </ItemContent>
    <ItemActions>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :aria-label="t('search.replaceOne', 'Replace')"
        @click="emit('replace')"
      >
        <IconReplace aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :aria-label="t('search.hide', 'Hide')"
        @click="emit('hide')"
      >
        <IconX aria-hidden="true" />
      </Button>
    </ItemActions>
  </Item>
</template>
