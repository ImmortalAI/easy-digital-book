<script setup lang="ts">
import { ref } from "vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import type { useSettingsStore } from "@/stores/settings";
import type { PlatformServices } from "@/types/platform";
import type { SupportedLocale } from "@/plugins/i18n";
import { appErrorFromUnknown } from "@/types/errors";

const props = defineProps<{
  services: PlatformServices;
  settings: ReturnType<typeof useSettingsStore>;
}>();
const { currentLocale, t, setLocale } = useSafeI18n();
const update = ref<{ version: string; url: string } | null>(null);
const updateMessage = ref("");
const day = 24 * 60 * 60 * 1000;

async function persist() {
  await props.settings.persist();
}

async function changeLocale(value: string) {
  if (value !== "ru" && value !== "en" && value !== "zh-CN") return;
  props.settings.locale = value as SupportedLocale;
  setLocale(value);
  await persist();
}

async function checkUpdates() {
  const now = Date.now();
  if (
    props.settings.updates.lastCheckedAt !== null &&
    now - props.settings.updates.lastCheckedAt < day
  ) {
    updateMessage.value = t(
      "settings.updateAlreadyChecked",
      "Updates were checked within the last day",
    );
    return;
  }
  props.settings.updates.lastCheckedAt = now;
  await persist();
  try {
    const result = await props.services.updates.check();
    update.value = result || null;
    updateMessage.value = result
      ? t("settings.updateAvailable", "A new version is available")
      : t("settings.upToDate", "You are up to date");
  } catch (error) {
    props.services.logger.warn("Update check failed", {
      code: appErrorFromUnknown(error, "updates.network").code,
    });
    updateMessage.value = "";
  }
}

async function openLogs() {
  try {
    await props.services.logs.openDirectory();
  } catch (error) {
    props.services.logger.warn("Could not open log directory", {
      code: appErrorFromUnknown(error, "platform.logs").code,
    });
  }
}
</script>

<template>
  <section class="settings-view" aria-labelledby="settings-title">
    <h1 id="settings-title">{{ t("settings.title", "Settings") }}</h1>
    <label data-setting="locale">
      {{ t("settings.language", "Interface language") }}
      <select
        :value="settings.locale ?? currentLocale"
        @change="changeLocale(($event.target as HTMLSelectElement).value)"
      >
        <option value="ru">Русский</option>
        <option value="en">English</option>
        <option value="zh-CN">简体中文</option>
      </select>
    </label>
    <fieldset>
      <legend>{{ t("settings.export", "Export") }}</legend>
      <label
        ><input
          v-model="settings.exportSettings.imagePreset"
          type="radio"
          value="kindle-paperwhite"
          @change="persist"
        />
        {{ t("export.kindle", "Kindle Paperwhite") }}</label
      >
      <label
        ><input
          v-model="settings.exportSettings.imagePreset"
          type="radio"
          value="original"
          @change="persist"
        />
        {{ t("export.original", "Without changes") }}</label
      >
      <label
        ><input v-model="settings.exportSettings.grayscale" type="checkbox" @change="persist" />
        {{ t("export.grayscale", "Grayscale") }}</label
      >
      <label
        ><input v-model="settings.exportSettings.titlePage" type="checkbox" @change="persist" />
        {{ t("export.titlePage", "Add title page") }}</label
      >
      <label
        ><input
          v-model="settings.exportSettings.versionInTitle"
          type="checkbox"
          @change="persist"
        />
        {{ t("export.versionInTitle", "Add version to title") }}</label
      >
    </fieldset>
    <label
      ><input v-model="settings.confirmDelete" type="checkbox" @change="persist" />
      {{ t("settings.confirmDelete", "Confirm deletions") }}</label
    >
    <div class="settings-view__updates">
      <button type="button" data-check-updates @click="checkUpdates">
        {{ t("settings.checkUpdates", "Check for updates") }}
      </button>
      <span role="status">{{ updateMessage }}</span>
      <a v-if="update" :href="update.url" target="_blank" rel="noreferrer">{{ update.version }}</a>
    </div>
    <button type="button" data-open-logs @click="openLogs">
      {{ t("settings.openLogs", "Open log folder") }}
    </button>
  </section>
</template>

<style scoped>
.settings-view {
  display: grid;
  gap: 1rem;
  max-width: 42rem;
  padding: 2rem;
}
.settings-view label,
.settings-view__updates {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.settings-view select {
  margin-left: auto;
}
.settings-view fieldset {
  display: grid;
  gap: 0.6rem;
}
</style>
