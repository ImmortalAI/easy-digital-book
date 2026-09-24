<script setup lang="ts">
import type { VariantProps } from "class-variance-authority";
import type { ToolbarToggleItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { injectToggleGroupRootContext, ToolbarToggleItem, useForwardProps } from "reka-ui";
import { computed, inject } from "vue";
import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";
import { toggleGroupItemClasses } from "@/components/ui/toggle-group";

type ToggleGroupVariants = VariantProps<typeof toggleVariants> & {
  spacing?: number;
};

const props = defineProps<
  ToolbarToggleItemProps & {
    class?: HTMLAttributes["class"];
    variant?: ToggleGroupVariants["variant"];
    size?: ToggleGroupVariants["size"];
  }
>();

const context = inject<ToggleGroupVariants>("toggleGroup");
const group = injectToggleGroupRootContext();

// Reka marks every toggle item with aria-pressed. In a single-choice group the
// items are a radio group: exactly one is checked, and "pressed" misdescribes it.
const radioAttrs = computed(() =>
  group.isSingle.value
    ? {
        role: "radio",
        "aria-checked": group.modelValue.value === props.value,
        "aria-pressed": undefined,
      }
    : {},
);

const delegatedProps = reactiveOmit(props, "class", "size", "variant");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <ToolbarToggleItem
    data-slot="toggle-group-item"
    :data-variant="context?.variant || variant"
    :data-size="context?.size || size"
    :data-spacing="context?.spacing"
    v-bind="{ ...forwardedProps, ...radioAttrs }"
    :class="
      cn(
        toggleGroupItemClasses,
        toggleVariants({
          variant: context?.variant || variant,
          size: context?.size || size,
        }),
        props.class,
      )
    "
  >
    <slot />
  </ToolbarToggleItem>
</template>
