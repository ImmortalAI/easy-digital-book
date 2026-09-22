<script setup lang="ts">
const props = defineProps<{ modelValue: string[]; label: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();
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
</script>
<template>
  <fieldset class="contributors-list">
    <legend>{{ label }}</legend>
    <div v-for="(person, index) in modelValue" :key="`${index}-${person}`" class="contributor-row">
      <input :value="person" @input="update(index, ($event.target as HTMLInputElement).value)" />
      <button type="button" :disabled="index === 0" @click="move(index, -1)">↑</button>
      <button type="button" :disabled="index === modelValue.length - 1" @click="move(index, 1)">
        ↓
      </button>
      <button type="button" @click="remove(index)">×</button>
    </div>
    <button type="button" @click="emit('update:modelValue', [...modelValue, ''])">+</button>
  </fieldset>
</template>
