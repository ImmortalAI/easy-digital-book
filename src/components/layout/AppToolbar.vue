<script setup lang="ts">
import { IconFileExport } from "@tabler/icons-vue";
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "@/components/ui/toolbar";
import { useLayoutStore, type LayoutMode } from "@/stores/layout";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const layout = useLayoutStore();
const emit = defineEmits<{ export: [] }>();
const { t } = useSafeI18n();
// Computed so the labels follow a live locale switch from Settings.
const modes = computed<Array<{ value: LayoutMode; label: string; shortcut: string }>>(() => [
  { value: "text", label: t("toolbar.text", "Text"), shortcut: "1" },
  { value: "split", label: t("toolbar.split", "Split"), shortcut: "2" },
  { value: "preview", label: t("toolbar.preview", "Preview"), shortcut: "3" },
]);
const disabled = computed(() => !["chapter", "css"].includes(layout.center.kind));

function isMode(value: unknown): value is LayoutMode {
  return modes.value.some((mode) => mode.value === value);
}

// A single-choice toggle group deselects its item on a second click and
// reports an empty value. Ignore it: the controlled model keeps the current
// mode checked, so the toolbar never ends up with no mode selected.
function setMode(mode: unknown) {
  if (disabled.value || !isMode(mode)) return;
  layout.mode = mode;
  void layout.persist();
}
</script>

<template>
  <Toolbar :aria-label="t('toolbar.editorMode', 'Editor mode')">
    <ToolbarToggleGroup
      type="single"
      variant="outline"
      size="sm"
      :aria-label="t('toolbar.previewMode', 'Preview mode')"
      :model-value="layout.mode"
      @update:model-value="setMode"
    >
      <ToolbarToggleItem
        v-for="item in modes"
        :key="item.value"
        :value="item.value"
        :disabled="disabled"
      >
        {{ item.label }}
        <Kbd>Mod+{{ item.shortcut }}</Kbd>
      </ToolbarToggleItem>
    </ToolbarToggleGroup>
    <ToolbarSeparator class="my-1" />
    <ToolbarButton as-child>
      <Button variant="ghost" size="sm" @click="emit('export')">
        <IconFileExport data-icon="inline-start" aria-hidden="true" />
        {{ t("export.action", "Export…") }}
      </Button>
    </ToolbarButton>
    <slot />
  </Toolbar>
</template>
