<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from "vue";
import WelcomeView from "@/views/WelcomeView.vue";
import EditorView from "@/views/EditorView.vue";
import UnsavedChangesDialog from "@/components/common/UnsavedChangesDialog.vue";
import { useProjectAutosave } from "@/composables/use-autosave";
import { projectFilesKey, useProjectFiles } from "@/composables/use-project-files";
import ToastStack from "@/components/common/ToastStack.vue";
import ErrorDetailsDialog from "@/components/common/ErrorDetailsDialog.vue";
import type { UnexpectedErrorReport } from "@/services/platform/error-reporting";
import type { UpdateInfo } from "@/types/platform";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const files = useProjectFiles();
const project = files.project;
const unexpectedError = ref<UnexpectedErrorReport | null>(null);
const availableUpdate = ref<UpdateInfo | null>(null);
const { t } = useSafeI18n();
function receiveError(event: Event) {
  unexpectedError.value = (event as CustomEvent<UnexpectedErrorReport>).detail;
}
async function checkUpdatesAtStartup() {
  const result = await files.settingsActions.checkUpdates();
  availableUpdate.value = result.update;
}
provide(projectFilesKey, files);
useProjectAutosave(files);

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
    <button type="button" @click="files.settingsActions.openUpdate(availableUpdate!.url)">
      {{ t("settings.openUpdate", "Open release") }}
    </button>
  </div>
  <div v-if="unexpectedError" class="editor-shell__dialog-backdrop">
    <ErrorDetailsDialog
      :report="unexpectedError"
      :actions="files.errorActions"
      @close="unexpectedError = null"
    />
  </div>
</template>
