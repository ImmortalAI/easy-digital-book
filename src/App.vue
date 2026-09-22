<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from "vue";
import WelcomeView from "@/views/WelcomeView.vue";
import EditorView from "@/views/EditorView.vue";
import UnsavedChangesDialog from "@/components/common/UnsavedChangesDialog.vue";
import { useAutosave } from "@/composables/use-autosave";
import { projectFilesKey, useProjectFiles } from "@/composables/use-project-files";
import ToastStack from "@/components/common/ToastStack.vue";
import ErrorDetailsDialog from "@/components/common/ErrorDetailsDialog.vue";
import { getRuntimePlatformServices } from "@/services/platform";
import type { UnexpectedErrorReport } from "@/services/platform/error-reporting";
import { appErrorFromUnknown } from "@/types/errors";
import type { UpdateInfo } from "@/types/platform";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const files = useProjectFiles();
const project = files.project;
const unexpectedError = ref<UnexpectedErrorReport | null>(null);
const availableUpdate = ref<UpdateInfo | null>(null);
const platform = getRuntimePlatformServices();
const { t } = useSafeI18n();
function receiveError(event: Event) {
  unexpectedError.value = (event as CustomEvent<UnexpectedErrorReport>).detail;
}
async function checkUpdatesAtStartup() {
  const now = Date.now();
  const lastCheckedAt = files.settings.updates.lastCheckedAt;
  if (lastCheckedAt !== null && now - lastCheckedAt < 24 * 60 * 60 * 1000) return;
  files.settings.updates.lastCheckedAt = now;
  await files.settings.persist();
  try {
    const result = await files.services.updates.check();
    availableUpdate.value = result || null;
  } catch (error) {
    files.services.logger.warn("Update check failed", {
      code: appErrorFromUnknown(error, "updates.network").code,
    });
  }
}
provide(projectFilesKey, files);
useAutosave({ project, services: files.services });

onMounted(async () => {
  window.addEventListener("edb-unexpected-error", receiveError);
  await files.initialize();
  void checkUpdatesAtStartup();
  await files.startLifecycle();
});
onUnmounted(() => {
  window.removeEventListener("edb-unexpected-error", receiveError);
  void files.disposeLifecycle();
});

function chooseUnsaved(value: "save" | "discard" | "cancel") {
  files.prompt?.choose(value);
}
</script>

<template>
  <EditorView v-if="project.book" />
  <WelcomeView v-else />
  <UnsavedChangesDialog
    v-if="files.prompt"
    :action="files.prompt.pending.value"
    @decision="chooseUnsaved"
  />
  <ToastStack />
  <div v-if="availableUpdate" class="update-notice" role="status">
    {{ t("settings.updateAvailable", "A new version is available") }}
    <button type="button" @click="platform.opener.open(availableUpdate!.url)">
      {{ t("settings.openUpdate", "Open release") }}
    </button>
  </div>
  <div v-if="unexpectedError" class="editor-shell__dialog-backdrop">
    <ErrorDetailsDialog
      :report="unexpectedError"
      :services="platform"
      @close="unexpectedError = null"
    />
  </div>
</template>
