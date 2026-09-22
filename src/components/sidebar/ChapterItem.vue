<script setup lang="ts">
import { extractTitle } from "@/services/book/extract-title";
import type { Chapter } from "@/types/book";
const props = defineProps<{
  chapter: Chapter;
  index: number;
  active: boolean;
  warningCount?: number;
}>();
const emit = defineEmits<{
  select: [];
  move: [direction: -1 | 1];
  remove: [];
  newAfter: [];
  contextmenu: [event: MouseEvent];
}>();
const title = () => extractTitle(props.chapter.source) || `Глава ${props.index + 1}`;
</script>
<template>
  <button
    class="explorer-chapter"
    :class="{ 'is-active': active, 'has-warning': warningCount }"
    type="button"
    draggable="true"
    @click="emit('select')"
    @keydown.alt.up.prevent="emit('move', -1)"
    @keydown.alt.down.prevent="emit('move', 1)"
    @contextmenu.prevent="emit('contextmenu', $event)"
  >
    <span>{{ index + 1 }}. </span><i v-if="!extractTitle(chapter.source)">{{ title() }}</i
    ><span v-else>{{ title() }}</span
    ><small v-if="warningCount">{{ warningCount }}</small>
  </button>
</template>
