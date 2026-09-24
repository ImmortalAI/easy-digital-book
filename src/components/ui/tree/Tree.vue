<script setup lang="ts" generic="T extends Record<string, any>">
import type { TreeRootEmits, TreeRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { TreeRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<TreeRootProps<T> & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<TreeRootEmits<T>>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TreeRoot
    v-slot="slotProps"
    data-slot="tree"
    v-bind="forwarded"
    :class="cn('flex flex-col gap-px text-sm outline-none', props.class)"
  >
    <slot v-bind="slotProps" />
  </TreeRoot>
</template>
