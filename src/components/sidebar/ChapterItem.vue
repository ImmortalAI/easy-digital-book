<script setup lang="ts">
import { extractTitle } from "@/services/book/extract-title";
import type { Chapter } from "@/types/book";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
const { t } = useSafeI18n();
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
  "context-action": [value: string];
  "drag-start": [event: DragEvent];
  drop: [event: DragEvent];
}>();
const title = () =>
  extractTitle(props.chapter.source) || props.fallbackTitle || `Chapter ${props.index + 1}`;
</script>
<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        class="explorer-chapter"
        data-explorer-chapter
        :data-chapter-index="index"
        :class="{ 'is-active': active, 'has-warning': warningCount }"
        draggable="true"
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
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem @select="emit('context-action', 'new-after')">
        {{ t("chapters.newAfter", "New chapter after") }}
      </ContextMenuItem>
      <ContextMenuItem variant="destructive" @select="emit('context-action', 'delete')">
        {{ t("common.delete", "Delete") }}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
