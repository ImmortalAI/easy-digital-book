<script setup lang="ts">
import type { FlattenedItem } from "reka-ui";
import { IconStarFilled } from "@tabler/icons-vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TreeItem } from "@/components/ui/tree";
const { t } = useSafeI18n();
defineProps<{
  /** The flattened tree node's bindings (value, level, aria-setsize/posinset). */
  bind: FlattenedItem<Record<string, unknown>>["bind"];
  path: string;
  cover: boolean;
  unused: boolean;
}>();
const emit = defineEmits<{
  select: [];
  contextmenu: [event: MouseEvent];
  "context-action": [value: string];
}>();
/** Selection is owned by the explorer (layout.center), not the tree's own model. */
function select(event: Event) {
  event.preventDefault();
  emit("select");
}
</script>
<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <TreeItem
        v-bind="bind"
        :class="{ 'text-muted-foreground': unused }"
        @select="select"
        @contextmenu="emit('contextmenu', $event)"
      >
        <span class="min-w-0 truncate">{{ path.replace(/^images\//, "") }}</span>
        <template v-if="cover">
          <IconStarFilled class="size-3 shrink-0 text-amber-500" aria-hidden="true" />
          <span class="sr-only">{{ t("images.usedAsCover", "Used as the cover") }}</span>
        </template>
        <small v-if="unused" class="shrink-0">— {{ t("images.unused", "not used") }}</small>
      </TreeItem>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem @select="emit('context-action', 'insert')">
        {{ t("images.insert", "Insert in text") }}
      </ContextMenuItem>
      <ContextMenuItem @select="emit('context-action', 'cover')">
        {{ t("images.setCover", "Make cover") }}
      </ContextMenuItem>
      <ContextMenuItem @select="emit('context-action', 'search')">
        {{ t("images.findUsage", "Find usages") }}
      </ContextMenuItem>
      <ContextMenuItem variant="destructive" @select="emit('context-action', 'delete')">
        {{ t("common.delete", "Delete") }}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
