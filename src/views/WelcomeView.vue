<script setup lang="ts">
import { inject, useId } from "vue";
import { useI18n } from "vue-i18n";
import { IconClock, IconFilePlus, IconFolderOpen, IconHistory } from "@tabler/icons-vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { injectProjectFiles, projectFilesKey } from "@/composables/use-project-files";

const { t } = useI18n();
const files = inject(projectFilesKey) ?? injectProjectFiles();
const recoveryId = useId();
const recentId = useId();
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-muted/30 p-6">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <h1 class="text-3xl font-semibold tracking-tight">{{ t("welcome.title") }}</h1>
        </CardTitle>
        <CardDescription>{{ t("welcome.subtitle") }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-3">
        <Button data-action="new-project" type="button" @click="void files.newBook()">
          <IconFilePlus aria-hidden="true" />
          {{ t("welcome.newProject") }}
        </Button>
        <Button
          data-action="open-project"
          type="button"
          variant="outline"
          @click="void files.open()"
        >
          <IconFolderOpen aria-hidden="true" />
          {{ t("welcome.openProject") }}
        </Button>
      </CardContent>
      <CardContent v-if="files.recoverySessions.value.length" class="flex flex-col gap-2">
        <h2 :id="recoveryId" class="font-medium">{{ t("welcome.recovery") }}</h2>
        <ItemGroup :aria-labelledby="recoveryId" class="gap-2">
          <div
            v-for="session in files.recoverySessions.value"
            :key="session.bookId"
            role="listitem"
          >
            <Item
              as="button"
              type="button"
              variant="outline"
              size="sm"
              class="text-left hover:bg-muted"
              @click="void files.restoreRecovery(session.bookId)"
            >
              <ItemMedia variant="icon">
                <IconHistory aria-hidden="true" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{{ session.title }}</ItemTitle>
              </ItemContent>
            </Item>
          </div>
        </ItemGroup>
      </CardContent>
      <CardContent v-if="files.settings.recentFiles.length" class="flex flex-col gap-2">
        <h2 :id="recentId" class="font-medium">{{ t("welcome.recent") }}</h2>
        <ItemGroup :aria-labelledby="recentId" class="gap-2">
          <div v-for="path in files.settings.recentFiles" :key="path" role="listitem">
            <Item
              as="button"
              type="button"
              variant="outline"
              size="sm"
              class="text-left hover:bg-muted"
              data-action="recent-project"
              :title="path"
              @click="void files.openPath(path)"
            >
              <ItemMedia variant="icon">
                <IconClock aria-hidden="true" />
              </ItemMedia>
              <ItemContent class="min-w-0">
                <ItemTitle class="w-full truncate">{{ path }}</ItemTitle>
              </ItemContent>
            </Item>
          </div>
        </ItemGroup>
      </CardContent>
    </Card>
  </main>
</template>
