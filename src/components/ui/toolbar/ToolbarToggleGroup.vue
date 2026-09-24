<script setup lang="ts">
import type { VariantProps } from "class-variance-authority";
import type { ToolbarToggleGroupEmits, ToolbarToggleGroupProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { toggleVariants } from "@/components/ui/toggle";
import { reactiveOmit } from "@vueuse/core";
import { injectToolbarRootContext, ToolbarToggleGroup, useForwardPropsEmits } from "reka-ui";
import { computed, provide } from "vue";
import { cn } from "@/lib/utils";
import { toggleGroupClasses } from "@/components/ui/toggle-group";

type ToggleGroupVariants = VariantProps<typeof toggleVariants>;

const props = withDefaults(
  defineProps<
    ToolbarToggleGroupProps & {
      class?: HTMLAttributes["class"];
      variant?: ToggleGroupVariants["variant"];
      size?: ToggleGroupVariants["size"];
      spacing?: number;
    }
  >(),
  {
    spacing: 0,
  },
);

const emits = defineEmits<ToolbarToggleGroupEmits>();

// Same key as ToggleGroup, so ToolbarToggleItem reads the variants the way
// ToggleGroupItem does.
provide("toggleGroup", {
  variant: props.variant,
  size: props.size,
  spacing: props.spacing,
});

const toolbar = injectToolbarRootContext();
// The shared toggle-group classes key their segment rounding and borders off
// data-horizontal / data-vertical, which Reka does not emit on its own.
const orientationAttrs = computed(() =>
  toolbar.orientation.value === "vertical" ? { "data-vertical": "" } : { "data-horizontal": "" },
);

// Reka hard-codes role="group". A single-choice group holds radios, so it is a
// radiogroup; rendering our own element as the child lets that role win.
const role = computed(() => (props.type === "single" ? "radiogroup" : "group"));

const delegatedProps = reactiveOmit(props, "class", "size", "variant", "spacing", "as", "asChild");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ToolbarToggleGroup v-bind="forwarded" as-child>
    <div
      data-slot="toggle-group"
      :role="role"
      :data-size="size"
      :data-variant="variant"
      :data-spacing="spacing"
      v-bind="orientationAttrs"
      :style="{
        '--gap': spacing,
      }"
      :class="cn(toggleGroupClasses, props.class)"
    >
      <slot />
    </div>
  </ToolbarToggleGroup>
</template>
