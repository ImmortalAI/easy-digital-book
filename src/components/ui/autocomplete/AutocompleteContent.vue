<script setup lang="ts">
// reka-ui re-exports Autocomplete{Content,Empty,Item}Props/Emits as aliases of
// their Combobox counterparts. The `defineProps<T>()` macro cannot resolve a
// renamed re-export, so the prop/emit *types* are imported under their
// original Combobox names while the *runtime* components stay Autocomplete*.
import type { ComboboxContentEmits, ComboboxContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import {
  AutocompleteContent,
  AutocompletePortal,
  AutocompleteViewport,
  useForwardPropsEmits,
} from "reka-ui";
import { cn } from "@/lib/utils";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<ComboboxContentProps & { class?: HTMLAttributes["class"] }>(),
  {
    position: "popper",
    align: "center",
    sideOffset: 4,
  },
);
const emits = defineEmits<ComboboxContentEmits>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <AutocompletePortal>
    <AutocompleteContent
      data-slot="autocomplete-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 max-h-72 min-w-36 overflow-hidden rounded-lg shadow-md ring-1 duration-100 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 cn-menu-translucent group/autocomplete-content z-50 w-(--reka-combobox-trigger-width)',
          props.class,
        )
      "
    >
      <AutocompleteViewport
        data-slot="autocomplete-viewport"
        class="no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0"
      >
        <slot />
      </AutocompleteViewport>
    </AutocompleteContent>
  </AutocompletePortal>
</template>
