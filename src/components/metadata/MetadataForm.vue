<script setup lang="ts">
import { computed, ref } from "vue";
import { useProjectStore } from "@/stores/project";
import { normalizeSeriesIndex, updateMetadata, setCover } from "@/services/book/metadata";
import { validateLanguage } from "@/composables/use-image-import";
import ContributorsList from "./ContributorsList.vue";
import LanguageCombobox from "./LanguageCombobox.vue";
import CoverPicker from "./CoverPicker.vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import type { ImageFile, ImageImportIdentity } from "@/composables/use-image-import";

const project = useProjectStore();
const { t } = useSafeI18n();
const props = defineProps<{
  onPickCover?: () => Promise<void>;
  onImportCover?: (file: ImageFile, identity: ImageImportIdentity) => Promise<void>;
}>();
const languageError = ref("");
const book = computed(() => project.book);
function patch(value: Record<string, unknown>) {
  if (project.book) project.applyMutation(updateMetadata(project.book, value));
}
function updateLanguage(value: string) {
  const result = validateLanguage(value);
  languageError.value = result.valid ? "" : "Invalid language tag";
  if (result.valid) patch({ language: result.canonical });
}
function updatePeople(field: "authors" | "translators", value: string[]) {
  patch({ [field]: value });
}
function updateSeriesName(value: string) {
  patch({ series: value ? { name: value, index: book.value?.metadata.series?.index ?? 1 } : null });
}
function updateSeriesIndex(value: string) {
  const index = normalizeSeriesIndex(value);
  if (book.value?.metadata.series && index !== null)
    patch({ series: { ...book.value.metadata.series, index } });
}
function removeCover() {
  if (project.book) project.applyMutation(setCover(project.book, null));
}
const coverPreview = computed(() => {
  const item = book.value?.metadata.cover
    ? book.value.resources.get(book.value.metadata.cover)
    : undefined;
  if (!item) return "";
  let text = "";
  for (const byte of item.bytes) text += String.fromCharCode(byte);
  return `data:${item.mediaType};base64,${btoa(text)}`;
});
</script>
<template>
  <form v-if="book" class="metadata-form" @submit.prevent>
    <h2>{{ t("metadata.title", "Metadata") }}</h2>
    <label
      >{{ t("metadata.bookTitle", "Title")
      }}<input
        :value="book.metadata.title"
        @input="patch({ title: ($event.target as HTMLInputElement).value })"
    /></label>
    <label
      >{{ t("metadata.version", "Version")
      }}<input
        :value="book.metadata.version ?? ''"
        :placeholder="t('metadata.versionHint', 'e.g. ch. 1–150')"
        @input="patch({ version: ($event.target as HTMLInputElement).value || null })"
    /></label>
    <label
      >{{ t("metadata.language", "Language")
      }}<LanguageCombobox
        :model-value="book.metadata.language"
        :error="languageError"
        @update:model-value="updateLanguage"
    /></label>
    <ContributorsList
      :model-value="book.metadata.authors"
      :label="t('metadata.authors', 'Authors')"
      @update:model-value="updatePeople('authors', $event)"
    />
    <ContributorsList
      :model-value="book.metadata.translators"
      :label="t('metadata.translators', 'Translators')"
      @update:model-value="updatePeople('translators', $event)"
    />
    <fieldset>
      <legend>{{ t("metadata.series", "Series") }}</legend>
      <input
        :value="book.metadata.series?.name ?? ''"
        @input="updateSeriesName(($event.target as HTMLInputElement).value)"
      /><input
        type="number"
        step="any"
        :value="book.metadata.series?.index ?? 1"
        :disabled="!book.metadata.series"
        @input="updateSeriesIndex(($event.target as HTMLInputElement).value)"
      />
    </fieldset>
    <label
      >{{ t("metadata.description", "Description")
      }}<textarea
        :value="book.metadata.description ?? ''"
        @input="patch({ description: ($event.target as HTMLTextAreaElement).value || null })"
      />
    </label>
    <CoverPicker
      :cover="book.metadata.cover"
      :preview="coverPreview"
      :on-pick="props.onPickCover"
      :on-drop-file="props.onImportCover"
      @remove="removeCover"
    />
    <dl class="metadata-readonly">
      <dt>UUID</dt>
      <dd>{{ book.metadata.id }}</dd>
      <dt>{{ t("metadata.created", "Created") }}</dt>
      <dd>{{ book.metadata.created }}</dd>
      <dt>{{ t("metadata.modified", "Modified") }}</dt>
      <dd>{{ book.metadata.modified }}</dd>
    </dl>
  </form>
</template>
