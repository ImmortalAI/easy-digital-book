<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-muted/30 p-6">
    <section class="w-full max-w-md space-y-6 rounded-xl border bg-background p-8 shadow-sm">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight">{{ t("welcome.title") }}</h1>
        <p class="text-muted-foreground">{{ t("welcome.subtitle") }}</p>
      </div>
      <div class="flex gap-3">
        <button class="rounded-md border px-4 py-2" type="button">
          {{ t("welcome.newProject") }}
        </button>
        <button class="rounded-md border px-4 py-2" type="button">
          {{ t("welcome.openProject") }}
        </button>
      </div>
    </section>
  </main>
</template>
