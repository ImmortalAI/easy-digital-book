<script setup lang="ts">
import { IconArrowDown, IconArrowUp, IconPlus, IconX } from "@tabler/icons-vue";
import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const props = defineProps<{ modelValue: string[]; label: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();
const { t } = useSafeI18n();

/**
 * `t()` only interpolates `{label}` when a real i18n instance resolved the
 * key; its fallback path returns the literal fallback string untouched. The
 * trailing replace() covers that fallback path the same way EditorView does
 * for its interpolated status line.
 */
function named(key: string, fallback: string) {
  return t(key, fallback, { label: props.label }).replace("{label}", props.label);
}

function update(index: number, value: string) {
  const next = [...props.modelValue];
  next[index] = value;
  emit("update:modelValue", next);
}
function remove(index: number) {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, item) => item !== index),
  );
}
function move(index: number, direction: -1 | 1) {
  const next = [...props.modelValue];
  const target = index + direction;
  if (target < 0 || target >= next.length) return;
  [next[index], next[target]] = [next[target]!, next[index]!];
  emit("update:modelValue", next);
}
function add() {
  emit("update:modelValue", [...props.modelValue, ""]);
}
</script>
<template>
  <FieldSet>
    <FieldLegend>{{ label }}</FieldLegend>
    <div
      v-for="(person, index) in modelValue"
      :key="`${index}-${person}`"
      class="flex items-center gap-2"
    >
      <Input :value="person" @input="update(index, ($event.target as HTMLInputElement).value)" />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :disabled="index === 0"
        :aria-label="named('metadata.moveUp', 'Move {label} up')"
        @click="move(index, -1)"
      >
        <IconArrowUp aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :disabled="index === modelValue.length - 1"
        :aria-label="named('metadata.moveDown', 'Move {label} down')"
        @click="move(index, 1)"
      >
        <IconArrowDown aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :aria-label="named('metadata.removeContributor', 'Remove {label}')"
        @click="remove(index)"
      >
        <IconX aria-hidden="true" />
      </Button>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      :aria-label="named('metadata.addContributor', 'Add {label}')"
      @click="add"
    >
      <IconPlus aria-hidden="true" />
    </Button>
  </FieldSet>
</template>
