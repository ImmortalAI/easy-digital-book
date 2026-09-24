<script setup lang="ts" generic="T extends Record<string, any>">
import type { TreeItemEmits, TreeItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { TreeItem, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/components/ui/item";

const props = defineProps<TreeItemProps<T> & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<TreeItemEmits<T>>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TreeItem
    v-slot="slotProps"
    data-slot="tree-item"
    v-bind="forwarded"
    :value="value"
    :level="level"
    :style="{ paddingInlineStart: `calc(${level - 1} * 1rem + 0.5rem)` }"
    :class="
      cn(
        itemVariants({ size: 'xs' }),
        'cursor-default flex-nowrap gap-1.5 rounded-md py-1 pe-1 hover:bg-muted data-[selected]:bg-accent data-[selected]:text-accent-foreground',
        props.class,
      )
    "
  >
    <slot v-bind="slotProps" />
  </TreeItem>
</template>
