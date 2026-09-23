<script setup lang="ts">
import { useSafeI18n } from "@/composables/use-safe-i18n";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
const { t } = useSafeI18n();
defineProps<{ path: string; cover: boolean; unused: boolean }>();
const emit = defineEmits<{ select: []; "context-action": [value: string] }>();
</script>
<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <button class="explorer-image" :class="{ unused }" type="button" @click="emit('select')">
        {{ path.replace(/^images\//, "") }} <small v-if="cover">★</small
        ><small v-if="unused"> — {{ t("images.unused", "not used") }}</small>
      </button>
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
