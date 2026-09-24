<script setup lang="ts">
// See AutocompleteContent.vue: reka-ui re-exports AutocompleteEmptyProps
// as an alias of ComboboxEmptyProps, which defineProps<T>() cannot resolve.
import type { ComboboxEmptyProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { AutocompleteEmpty } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ComboboxEmptyProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <AutocompleteEmpty
    data-slot="autocomplete-empty"
    v-bind="delegatedProps"
    :class="
      cn(
        'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/autocomplete-content:flex',
        props.class,
      )
    "
  >
    <slot />
  </AutocompleteEmpty>
</template>
