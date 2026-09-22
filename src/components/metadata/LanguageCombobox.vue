<script setup lang="ts">
import { computed } from "vue";
import { validateLanguage } from "@/composables/use-image-import";
const props = defineProps<{ modelValue: string; error?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string]; invalid: [message: string] }>();
const languages = ["en", "en-US", "ru", "ru-RU", "zh-CN", "de", "fr", "ja"];
const validation = computed(() => validateLanguage(props.modelValue));
function update(value: string) {
  emit("update:modelValue", value);
  if (!validateLanguage(value).valid) emit("invalid", "Invalid language tag");
}
</script>
<template>
  <div class="metadata-field">
    <input
      list="language-options"
      :value="modelValue"
      @input="update(($event.target as HTMLInputElement).value)"
    />
    <datalist id="language-options">
      <option v-for="language in languages" :key="language" :value="language" />
    </datalist>
    <small v-if="error || (modelValue && !validation.valid)" class="field-error">{{
      error || "Invalid language tag"
    }}</small>
  </div>
</template>
