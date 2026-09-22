<script setup lang="ts">
import type { SearchResult } from "@/services/search/query";
import { useSafeI18n } from "@/composables/use-safe-i18n";
defineProps<{ result: SearchResult; chapterTitle: string; replacementVisible?: boolean }>();
const emit = defineEmits<{ select: []; replace: []; hide: [] }>();
const { t } = useSafeI18n();
</script>
<template>
  <div class="search-result">
    <button type="button" @click="emit('select')">
      <strong>{{ chapterTitle }}</strong
      ><span>{{ result.matched }}</span>
      <small v-if="replacementVisible && result.replacementPreview" class="replacement-preview"
        >→ {{ result.replacementPreview }}</small
      >
    </button>
    <button type="button" :aria-label="t('search.replaceOne', 'Replace')" @click="emit('replace')">
      ↔
    </button>
    <button type="button" :aria-label="t('search.hide', 'Hide')" @click="emit('hide')">×</button>
  </div>
</template>
