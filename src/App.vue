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
import { IconDownload } from "@tabler/icons-vue";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";

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
  <ToastProvider
    :duration="8000"
    swipe-direction="right"
    :label="t('notifications.label', 'Notification')"
  >
    <EditorView v-if="project.book" />
    <WelcomeView v-else />
    <UnsavedChangesDialog
      v-if="files.prompt"
      :action="files.prompt.pending.value"
      @decision="chooseUnsaved"
    />
    <ToastStack>
      <!-- A third grid column keeps the action in flow: the registry pins it
           absolutely over a fixed right padding, which a longer title or a
           translated button label would run underneath. -->
      <Alert
        v-if="availableUpdate"
        role="status"
        class="w-auto max-w-sm items-center shadow-lg has-[>svg]:grid-cols-[auto_1fr_auto] has-data-[slot=alert-action]:pr-2.5 *:[svg]:translate-y-0"
      >
        <IconDownload aria-hidden="true" />
        <AlertTitle>{{ t("settings.updateAvailable", "A new version is available") }}</AlertTitle>
        <AlertAction class="static col-start-3 row-start-1">
          <Button size="xs" @click="files.settingsActions.openUpdate(availableUpdate!.url)">
            {{ t("settings.openUpdate", "Open release") }}
          </Button>
        </AlertAction>
      </Alert>
    </ToastStack>
    <ErrorDetailsDialog
      v-if="unexpectedError"
      :report="unexpectedError"
      :actions="files.errorActions"
      @close="unexpectedError = null"
    />
  </ToastProvider>
</template>
