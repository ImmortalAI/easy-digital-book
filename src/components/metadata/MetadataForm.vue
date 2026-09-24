<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useProjectStore } from "@/stores/project";
import { updateMetadata, setCover } from "@/services/book/metadata";
import { validateLanguage } from "@/composables/use-image-import";
import ContributorsList from "./ContributorsList.vue";
import LanguageCombobox from "./LanguageCombobox.vue";
import CoverPicker from "./CoverPicker.vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { Field, FieldSet, FieldLegend } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NumberField, NumberFieldInput } from "@/components/ui/number-field";
import { Separator } from "@/components/ui/separator";
import type { ImageFile, ImageImportIdentity } from "@/composables/use-image-import";
import type { Resource } from "@/types/book";

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
  languageError.value = result.valid ? "" : t("metadata.invalidLanguage", "Invalid language tag");
  if (result.valid) patch({ language: result.canonical });
}
function updatePeople(field: "authors" | "translators", value: string[]) {
  patch({ [field]: value });
}
function updateSeriesName(value: string) {
  patch({ series: value ? { name: value, index: book.value?.metadata.series?.index ?? 1 } : null });
}
function updateSeriesIndex(value: number | undefined) {
  if (book.value?.metadata.series && typeof value === "number" && Number.isFinite(value))
    patch({ series: { ...book.value.metadata.series, index: value } });
}
function removeCover() {
  if (project.book) project.applyMutation(setCover(project.book, null));
}
/**
 * Every patch() replaces the book object, so a preview derived from it plainly
 * would be rebuilt on each keystroke — a multi-megabyte re-encode on the main
 * thread for a large cover. The cover Resource keeps its identity across those
 * patches, so it can key the cache, and a blob URL avoids base64 entirely.
 */
let cachedCover: { resource: Resource; url: string; owned: boolean } | null = null;

function releaseCover() {
  if (cachedCover?.owned && typeof URL.revokeObjectURL === "function")
    URL.revokeObjectURL(cachedCover.url);
  cachedCover = null;
}

const coverPreview = computed(() => {
  const path = book.value?.metadata.cover;
  const item = path ? book.value?.resources.get(path) : undefined;
  if (!item) {
    releaseCover();
    return "";
  }
  if (cachedCover?.resource === item) return cachedCover.url;
  releaseCover();
  const blob = new Blob([item.bytes as unknown as BlobPart], { type: item.mediaType });
  const owned = typeof URL.createObjectURL === "function";
  const url = owned ? URL.createObjectURL(blob) : "";
  cachedCover = { resource: item, url, owned };
  return url;
});

onBeforeUnmount(releaseCover);
</script>
<template>
  <form v-if="book" class="flex max-w-2xl flex-col gap-6 p-8" @submit.prevent>
    <h2 class="text-base font-semibold">{{ t("metadata.title", "Metadata") }}</h2>

    <Field>
      <Label for="metadata-title">{{ t("metadata.bookTitle", "Title") }}</Label>
      <Input
        id="metadata-title"
        :model-value="book.metadata.title"
        @update:model-value="(value) => patch({ title: String(value) })"
      />
    </Field>

    <Field>
      <Label for="metadata-version">{{ t("metadata.version", "Version") }}</Label>
      <Input
        id="metadata-version"
        :model-value="book.metadata.version ?? ''"
        :placeholder="t('metadata.versionHint', 'e.g. ch. 1–150')"
        @update:model-value="(value) => patch({ version: String(value) || null })"
      />
    </Field>

    <LanguageCombobox
      :model-value="book.metadata.language"
      :error="languageError"
      @update:model-value="updateLanguage"
    />

    <ContributorsList
      :model-value="book.metadata.authors"
      :label="t('metadata.authors', 'Authors')"
      :item-label="t('metadata.author', 'Author')"
      @update:model-value="updatePeople('authors', $event)"
    />
    <ContributorsList
      :model-value="book.metadata.translators"
      :label="t('metadata.translators', 'Translators')"
      :item-label="t('metadata.translator', 'Translator')"
      @update:model-value="updatePeople('translators', $event)"
    />

    <FieldSet>
      <FieldLegend>{{ t("metadata.series", "Series") }}</FieldLegend>
      <Field>
        <Label for="metadata-series-name">{{ t("metadata.seriesName", "Series name") }}</Label>
        <Input
          id="metadata-series-name"
          :model-value="book.metadata.series?.name ?? ''"
          @update:model-value="(value) => updateSeriesName(String(value))"
        />
      </Field>
      <Field>
        <Label for="metadata-series-index">{{ t("metadata.seriesIndex", "Volume") }}</Label>
        <NumberField
          id="metadata-series-index"
          :model-value="book.metadata.series?.index ?? 1"
          :disabled="!book.metadata.series"
          :format-options="{ maximumFractionDigits: 2 }"
          @update:model-value="updateSeriesIndex"
        >
          <NumberFieldInput />
        </NumberField>
      </Field>
    </FieldSet>

    <Field>
      <Label for="metadata-description">{{ t("metadata.description", "Description") }}</Label>
      <Textarea
        id="metadata-description"
        :model-value="book.metadata.description ?? ''"
        @update:model-value="(value) => patch({ description: String(value) || null })"
      />
    </Field>

    <CoverPicker
      :cover="book.metadata.cover"
      :preview="coverPreview"
      :on-pick="props.onPickCover"
      :on-drop-file="props.onImportCover"
      @remove="removeCover"
    />

    <Separator />

    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <dt class="font-medium text-foreground">UUID</dt>
      <dd>{{ book.metadata.id }}</dd>
      <dt class="font-medium text-foreground">{{ t("metadata.created", "Created") }}</dt>
      <dd>{{ book.metadata.created }}</dd>
      <dt class="font-medium text-foreground">{{ t("metadata.modified", "Modified") }}</dt>
      <dd>{{ book.metadata.modified }}</dd>
    </dl>
  </form>
</template>
