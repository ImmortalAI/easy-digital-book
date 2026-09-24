<script setup lang="ts">
import type { AutocompleteRootEmits, AutocompleteRootProps } from "reka-ui";
import { AutocompleteRoot, useForwardPropsEmits } from "reka-ui";

const props = defineProps<AutocompleteRootProps>();
const emits = defineEmits<AutocompleteRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <AutocompleteRoot v-slot="slotProps" data-slot="autocomplete" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </AutocompleteRoot>
</template>
