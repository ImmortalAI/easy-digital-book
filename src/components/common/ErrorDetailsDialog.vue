<script setup lang="ts">
import { ref } from "vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import type { UnexpectedErrorReport } from "@/services/platform/error-reporting";
import type { PlatformServices } from "@/types/platform";

const props = defineProps<{ report: UnexpectedErrorReport; services: PlatformServices }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useSafeI18n();
const copied = ref(false);

async function copyDetails() {
  await navigator.clipboard?.writeText(props.report.details);
  copied.value = true;
}

async function openLogs() {
  await props.services.logs.openDirectory();
}

async function reportIssue() {
  await props.services.opener.open(props.report.issueUrl);
}
</script>

<template>
  <section
    class="error-details-dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="error-title"
  >
    <h2 id="error-title">
      {{ t(`errors.${report.code}`, t("errors.title", "An unexpected error occurred")) }}
    </h2>
    <p>{{ t("errors.explanation", "The error was recorded without book contents.") }}</p>
    <pre data-error-details>{{ report.details }}</pre>
    <p v-if="copied" role="status">{{ t("errors.copied", "Details copied") }}</p>
    <footer>
      <button type="button" @click="copyDetails">{{ t("errors.copy", "Copy details") }}</button>
      <button type="button" @click="openLogs">{{ t("errors.openLogs", "Log folder") }}</button>
      <button type="button" @click="reportIssue">{{ t("errors.report", "Report issue") }}</button>
      <button type="button" @click="emit('close')">{{ t("common.close", "Close") }}</button>
    </footer>
  </section>
</template>

<style scoped>
.error-details-dialog {
  display: grid;
  gap: 0.8rem;
  width: min(40rem, calc(100vw - 2rem));
  padding: 1.25rem;
  border: 1px solid var(--destructive);
  border-radius: 0.75rem;
  background: var(--background);
  box-shadow: 0 1rem 3rem rgb(0 0 0 / 20%);
}
.error-details-dialog pre {
  max-height: 16rem;
  overflow: auto;
  white-space: pre-wrap;
}
.error-details-dialog footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
