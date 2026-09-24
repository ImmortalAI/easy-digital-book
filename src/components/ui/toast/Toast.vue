<script setup lang="ts">
import type { ToastRootEmits, ToastRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { AlertVariants } from "@/components/ui/alert";
import { reactiveOmit } from "@vueuse/core";
import { ToastRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { alertVariants } from "@/components/ui/alert";

const props = defineProps<
  ToastRootProps & {
    class?: HTMLAttributes["class"];
    variant?: AlertVariants["variant"];
  }
>();
const emits = defineEmits<ToastRootEmits>();

const delegatedProps = reactiveOmit(props, "class", "variant");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ToastRoot
    v-slot="slotProps"
    data-slot="toast"
    v-bind="forwarded"
    :class="cn(alertVariants({ variant }), 'shadow-lg', props.class)"
  >
    <slot v-bind="slotProps" />
  </ToastRoot>
</template>
