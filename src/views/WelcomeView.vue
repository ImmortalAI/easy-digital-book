<script setup lang="ts">
import { inject } from "vue";
import { useI18n } from "vue-i18n";
import { injectProjectFiles, projectFilesKey } from "@/composables/use-project-files";

const { t } = useI18n();
const files = inject(projectFilesKey) ?? injectProjectFiles();
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-muted/30 p-6">
    <section class="w-full max-w-md space-y-6 rounded-xl border bg-background p-8 shadow-sm">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight">{{ t("welcome.title") }}</h1>
        <p class="text-muted-foreground">{{ t("welcome.subtitle") }}</p>
      </div>
      <div class="flex gap-3">
        <button
          class="rounded-md border px-4 py-2"
          data-action="new-project"
          type="button"
          @click="void files.newBook()"
        >
          {{ t("welcome.newProject") }}
        </button>
        <button
          class="rounded-md border px-4 py-2"
          data-action="open-project"
          type="button"
          @click="void files.open()"
        >
          {{ t("welcome.openProject") }}
        </button>
      </div>
      <section v-if="files.recoverySessions.value.length" class="space-y-2">
        <h2 class="font-medium">{{ t("welcome.recovery") }}</h2>
        <button
          v-for="session in files.recoverySessions.value"
          :key="session.bookId"
          class="block w-full rounded-md border p-2 text-left"
          type="button"
          @click="void files.restoreRecovery(session.bookId)"
        >
          {{ session.title }}
        </button>
      </section>
      <section v-if="files.settings.recentFiles.length" class="space-y-2">
        <h2 class="font-medium">{{ t("welcome.recent") }}</h2>
        <button
          v-for="path in files.settings.recentFiles"
          :key="path"
          class="block w-full truncate rounded-md border p-2 text-left"
          data-action="recent-project"
          type="button"
          @click="void files.openPath(path)"
        >
          {{ path }}
        </button>
      </section>
    </section>
  </main>
</template>
