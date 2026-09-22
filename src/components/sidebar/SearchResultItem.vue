<script setup lang="ts">
import type { SearchResult } from "@/services/search/query";
defineProps<{ result: SearchResult; chapterTitle: string }>();
const emit = defineEmits<{ select: []; replace: [] }>();
</script>
<template>
  <div class="search-result">
    <button type="button" @click="emit('select')">
      <strong>{{ chapterTitle }}</strong
      ><span>{{ result.matched }}</span>
      <small v-if="result.replacementPreview">→ {{ result.replacementPreview }}</small>
    </button>
    <button type="button" aria-label="Replace" @click="emit('replace')">↔</button>
  </div>
</template>
