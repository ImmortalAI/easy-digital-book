<script setup lang="ts">
import type { ToolbarSeparatorProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ToolbarSeparator } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ToolbarSeparatorProps & { class?: HTMLAttributes["class"] }>();

// Reka stamps the toolbar's own orientation on the separator, so a horizontal
// toolbar yields data-orientation="horizontal" and needs a vertical rule.
const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <ToolbarSeparator
    data-slot="toolbar-separator"
    v-bind="delegatedProps"
    :class="
      cn(
        'shrink-0 bg-border data-[orientation=horizontal]:w-px data-[orientation=horizontal]:self-stretch data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full',
        props.class,
      )
    "
  />
</template>
