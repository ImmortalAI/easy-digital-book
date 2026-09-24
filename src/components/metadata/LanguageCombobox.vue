<script setup lang="ts">
import { computed, watch } from "vue";
import { validateLanguage } from "@/composables/use-image-import";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
} from "@/components/ui/autocomplete";

const props = defineProps<{ modelValue: string; error?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string]; invalid: [message: string] }>();
const { t } = useSafeI18n();
const languages = ["en", "en-US", "ru", "ru-RU", "zh-CN", "de", "fr", "ja"];
const validation = computed(() => validateLanguage(props.modelValue));
const errorMessage = computed(() => {
  if (props.error) return props.error;
  return props.modelValue && !validation.value.valid ? "Invalid language tag" : "";
});

/**
 * A BCP 47 tag is typed one character at a time, and most prefixes of a
 * valid tag ("pt-", "pt-B") are themselves invalid, so checking validity on
 * every keystroke would fire `invalid` continuously while the user is still
 * typing a tag that turns out fine. Instead the latest typed value is
 * tracked locally and only validated once the field is committed (blurred).
 */
let latestValue = props.modelValue;
watch(
  () => props.modelValue,
  (value) => (latestValue = value),
);
function update(value: string) {
  latestValue = value;
  emit("update:modelValue", value);
}
function commit() {
  if (!validateLanguage(latestValue).valid) emit("invalid", "Invalid language tag");
}
</script>

<template>
  <Field>
    <Label for="metadata-language">{{ t("metadata.language", "Language") }}</Label>
    <Autocomplete :model-value="modelValue" @update:model-value="update">
      <AutocompleteInput id="metadata-language" @blur="commit" />
      <AutocompleteContent>
        <AutocompleteEmpty>{{
          t("metadata.languageNoMatches", "No matching suggestions")
        }}</AutocompleteEmpty>
        <AutocompleteItem v-for="language in languages" :key="language" :value="language">
          {{ language }}
        </AutocompleteItem>
      </AutocompleteContent>
    </Autocomplete>
    <FieldError v-if="errorMessage">{{ errorMessage }}</FieldError>
  </Field>
</template>
