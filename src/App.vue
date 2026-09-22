<script setup lang="ts">
import { onMounted, onUnmounted, provide } from "vue";
import WelcomeView from "@/views/WelcomeView.vue";
import EditorView from "@/views/EditorView.vue";
import UnsavedChangesDialog from "@/components/common/UnsavedChangesDialog.vue";
import { useAutosave } from "@/composables/use-autosave";
import { projectFilesKey, useProjectFiles } from "@/composables/use-project-files";

const files = useProjectFiles();
const project = files.project;
provide(projectFilesKey, files);
useAutosave({ project, services: files.services });

onMounted(async () => {
  await files.initialize();
  await files.startLifecycle();
});
onUnmounted(() => void files.disposeLifecycle());

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
</template>
