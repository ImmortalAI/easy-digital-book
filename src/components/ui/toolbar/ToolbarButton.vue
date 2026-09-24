<script setup lang="ts">
import type { ToolbarButtonProps } from "reka-ui";
import { ToolbarButton } from "reka-ui";

// A thin pass-through so app code reaches Reka's toolbar parts only through
// this folder; styling comes from the Button it usually wraps via as-child.
const props = defineProps<ToolbarButtonProps>();
</script>

<template>
  <ToolbarButton data-slot="toolbar-button" v-bind="props">
    <slot />
  </ToolbarButton>
</template>
