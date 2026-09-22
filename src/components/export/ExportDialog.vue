<script setup lang="ts">
import { computed, ref } from "vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import type { ExportController } from "@/composables/use-export";
import type { useProjectStore } from "@/stores/project";

const props = defineProps<{
  controller: ExportController;
  project?: ReturnType<typeof useProjectStore>;
}>();
const emit = defineEmits<{ close: [] }>();
const { t } = useSafeI18n();
const abortController = ref<AbortController | null>(null);
const success = ref(false);
const hasVersion = computed(() => Boolean(props.project?.book?.metadata.version));
/** Prefer a message for the specific failure, falling back to the generic one. */
const errorMessage = computed(() => {
  const error = props.controller.error.value;
  const generic = t("errors.export.failed", "Could not export EPUB");
  return error ? t(`errors.${error.code}`, generic, error.params) : generic;
});

async function exportBook() {
  if (props.controller.exporting.value) return;
  success.value = false;
  const controller = new AbortController();
  abortController.value = controller;
  try {
    const target = await props.controller.exportEpub({
      signal: controller.signal,
      dialogTitle: t("export.title", "Export EPUB"),
      dialogFilterName: t("export.filterName", "EPUB book"),
    });
    success.value = Boolean(target);
  } catch {
    // The controller stores a localized-safe AppError for the template.
  } finally {
    abortController.value = null;
  }
}

function cancelExport() {
  if (props.controller.exporting.value) abortController.value?.abort();
  else emit("close");
}
</script>

<template>
  <section class="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title">
    <header>
      <h2 id="export-title">{{ t("export.title", "Export EPUB") }}</h2>
      <button type="button" :aria-label="t('common.close', 'Close')" @click="cancelExport">
        ×
      </button>
    </header>
    <ul
      v-if="controller.warnings.value.length"
      class="export-dialog__warnings"
      data-export-warnings
    >
      <li
        v-for="warning in controller.warnings.value"
        :key="`${warning.code}-${warning.chapterId ?? ''}`"
      >
        {{ warning.message }}
      </li>
    </ul>
    <label>
      {{ t("export.preset", "Image preset") }}
      <select v-model="controller.options.value.imagePreset" data-export-preset>
        <option value="kindle-paperwhite">{{ t("export.kindle", "Kindle Paperwhite") }}</option>
        <option value="original">{{ t("export.original", "Without changes") }}</option>
      </select>
    </label>
    <label
      ><input v-model="controller.options.value.grayscale" type="checkbox" />
      {{ t("export.grayscale", "Grayscale") }}</label
    >
    <label>
      <input v-model="controller.options.value.titlePage" type="checkbox" />
      {{ t("export.titlePage", "Add title page") }}
    </label>
    <label>
      <input
        v-model="controller.options.value.versionInTitle"
        type="checkbox"
        data-export-version
        :disabled="!hasVersion"
      />
      {{ t("export.versionInTitle", "Add version to title") }}
    </label>
    <p class="export-dialog__filename" data-export-filename>{{ controller.fileName.value }}</p>
    <p v-if="controller.progress.value" data-export-progress>
      <span v-if="controller.progress.value.stage === 'images'">
        {{ t("export.progressImages", "Images {done}/{total}", controller.progress.value) }}
      </span>
      <span v-else-if="controller.progress.value.stage === 'chapters'">
        {{ t("export.progressChapters", "Chapters {done}/{total}", controller.progress.value) }}
      </span>
      <span v-else>{{ t("export.progressZip", "Creating EPUB…") }}</span>
    </p>
    <p v-if="controller.error.value" class="export-dialog__error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-if="success" class="export-dialog__success" data-export-success role="status">
      {{ t("export.saved", "EPUB saved") }}
      <button type="button" @click="controller.revealOutput()">
        {{ t("export.showInFolder", "Show in folder") }}
      </button>
    </p>
    <footer>
      <button type="button" @click="cancelExport">
        {{ controller.exporting.value ? t("common.cancel", "Cancel") : t("common.close", "Close") }}
      </button>
      <button
        v-if="!success"
        type="button"
        data-export-submit
        :disabled="controller.exporting.value"
        @click="exportBook"
      >
        {{ t("export.action", "Export…") }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.export-dialog {
  display: grid;
  gap: 0.8rem;
  width: min(32rem, calc(100vw - 2rem));
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--background);
  box-shadow: 0 1rem 3rem rgb(0 0 0 / 20%);
}
.export-dialog header,
.export-dialog footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.export-dialog label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.export-dialog select {
  margin-left: auto;
}
.export-dialog__filename {
  padding: 0.5rem;
  background: var(--muted);
  overflow-wrap: anywhere;
}
.export-dialog__warnings {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--destructive);
}
.export-dialog__error {
  color: var(--destructive);
}
.export-dialog__success {
  color: var(--primary);
}
</style>
