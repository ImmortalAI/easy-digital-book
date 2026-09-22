<script setup lang="ts">
import { extractTitle } from "@/services/book/extract-title";
import type { Chapter } from "@/types/book";
const props = defineProps<{
  chapter: Chapter;
  index: number;
  active: boolean;
  warningCount?: number;
  fallbackTitle?: string;
}>();
const emit = defineEmits<{
  select: [];
  move: [direction: -1 | 1];
  navigate: [direction: -1 | 1];
  remove: [];
  newAfter: [];
  contextmenu: [event: MouseEvent];
  "drag-start": [event: DragEvent];
  drop: [event: DragEvent];
}>();
const title = () =>
  extractTitle(props.chapter.source) || props.fallbackTitle || `Chapter ${props.index + 1}`;
</script>
<template>
  <div
    class="explorer-chapter"
    data-explorer-chapter
    :class="{ 'is-active': active, 'has-warning': warningCount }"
    draggable="true"
    @contextmenu.prevent="emit('contextmenu', $event)"
    @dragstart="emit('drag-start', $event)"
    @dragover.prevent
    @drop.prevent="emit('drop', $event)"
  >
    <button
      class="explorer-chapter__select"
      type="button"
      @click="emit('select')"
      @keydown.arrow-up.exact.prevent="emit('navigate', -1)"
      @keydown.arrow-down.exact.prevent="emit('navigate', 1)"
      @keydown.enter.prevent="emit('select')"
      @keydown.alt.up.prevent="emit('move', -1)"
      @keydown.alt.down.prevent="emit('move', 1)"
    >
      <span>{{ index + 1 }}. </span><i v-if="!extractTitle(chapter.source)">{{ title() }}</i
      ><span v-else>{{ title() }}</span
      ><small v-if="warningCount">{{ warningCount }}</small>
    </button>
    <span class="explorer-chapter__actions">
      <button type="button" @click.stop="emit('newAfter')">+</button>
      <button type="button" data-chapter-delete @click.stop="emit('remove')">×</button>
    </span>
  </div>
</template>
