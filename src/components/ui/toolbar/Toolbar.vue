<script setup lang="ts">
import type { ToolbarRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ToolbarRoot, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ToolbarRootProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <ToolbarRoot
    data-slot="toolbar"
    v-bind="forwarded"
    :class="cn('flex items-center gap-2 aria-[orientation=vertical]:flex-col', props.class)"
  >
    <slot />
  </ToolbarRoot>
</template>
