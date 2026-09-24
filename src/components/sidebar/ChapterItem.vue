<script setup lang="ts">
import { nextTick, useId } from "vue";
import type { FlattenedItem } from "reka-ui";
import { IconPlus, IconX } from "@tabler/icons-vue";
import { extractTitle } from "@/services/book/extract-title";
import type { Chapter } from "@/types/book";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TreeItem } from "@/components/ui/tree";
const { t } = useSafeI18n();
const props = defineProps<{
  /** The flattened tree node's bindings (value, level, aria-setsize/posinset). */
  bind: FlattenedItem<Record<string, unknown>>["bind"];
  chapter: Chapter;
  index: number;
  warningCount?: number;
  fallbackTitle?: string;
}>();
const emit = defineEmits<{
  select: [];
  move: [direction: -1 | 1];
  remove: [];
  newAfter: [];
  "context-action": [value: string];
  "drag-start": [event: DragEvent];
  drop: [event: DragEvent];
}>();
const labelId = useId();
const title = () =>
  extractTitle(props.chapter.source) || props.fallbackTitle || `Chapter ${props.index + 1}`;
/** Selection is owned by the explorer (layout.center), not the tree's own model. */
function select(event: Event) {
  event.preventDefault();
  emit("select");
}
/**
 * Alt+↑/↓ reorders. Reka's roving focus ignores Alt+Arrow, so the row keeps
 * focus; re-focus it after the reorder in case the DOM move dropped it.
 */
function move(direction: -1 | 1, event: KeyboardEvent) {
  const row = event.currentTarget as HTMLElement;
  emit("move", direction);
  void nextTick(() => {
    if (document.activeElement !== row) row.focus();
  });
}
</script>
<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <TreeItem
        v-bind="bind"
        :aria-labelledby="labelId"
        data-explorer-chapter
        :data-chapter-index="index"
        draggable="true"
        @select="select"
        @keydown.alt.up.prevent="move(-1, $event)"
        @keydown.alt.down.prevent="move(1, $event)"
        @dragstart="emit('drag-start', $event)"
        @dragover.prevent
        @drop.prevent="emit('drop', $event)"
      >
        <span :id="labelId" class="min-w-0 flex-1 truncate">
          <span>{{ index + 1 }}. </span
          ><span :class="{ italic: !extractTitle(chapter.source) }">{{ title() }}</span>
          <small v-if="warningCount" class="ms-1 text-amber-600 dark:text-amber-400">{{
            warningCount
          }}</small>
        </span>
        <span class="flex shrink-0 text-muted-foreground">
          <button
            type="button"
            class="rounded-sm p-0.5 hover:bg-background"
            :aria-label="t('chapters.newAfter', 'New chapter after')"
            @click.stop="emit('newAfter')"
          >
            <IconPlus class="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="rounded-sm p-0.5 hover:bg-background"
            data-chapter-delete
            :aria-label="t('common.delete', 'Delete')"
            @click.stop="emit('remove')"
          >
            <IconX class="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </TreeItem>
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
