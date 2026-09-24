<script setup lang="ts">
import type { ToastViewportProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ToastViewport } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ToastViewportProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <ToastViewport
    data-slot="toast-viewport"
    v-bind="delegatedProps"
    :class="
      cn(
        'fixed right-4 bottom-4 z-50 m-0 flex w-[min(24rem,calc(100vw-2rem))] list-none flex-col gap-2 p-0 outline-none',
        props.class,
      )
    "
  >
    <slot />
  </ToastViewport>
</template>
