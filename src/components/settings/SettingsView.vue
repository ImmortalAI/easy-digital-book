<script setup lang="ts">
import { ref } from "vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import type { useSettingsStore } from "@/stores/settings";
import type { SupportedLocale } from "@/plugins/i18n";
import type { SettingsActions } from "@/composables/use-settings-actions";

const props = defineProps<{
  settings: ReturnType<typeof useSettingsStore>;
  actions: SettingsActions;
}>();
const { currentLocale, t, setLocale } = useSafeI18n();
const update = ref<{ version: string; url: string } | null>(null);
const updateMessage = ref("");

const persist = () => props.actions.persist();

async function changeLocale(value: string) {
  if (value !== "ru" && value !== "en" && value !== "zh-CN") return;
  props.settings.locale = value as SupportedLocale;
  setLocale(value);
  await props.actions.persist();
}

async function checkUpdates() {
  const result = await props.actions.checkUpdates();
  if (result.status === "skipped") {
    updateMessage.value = t(
      "settings.updateAlreadyChecked",
      "Updates were checked within the last day",
    );
    return;
  }
  update.value = result.update;
  updateMessage.value =
    result.status === "failed"
      ? t("settings.updateCheckFailed", "Could not check for updates")
      : result.update
        ? t("settings.updateAvailable", "A new version is available")
        : t("settings.upToDate", "You are up to date");
}

const openLogs = () => props.actions.openLogs();
</script>

<template>
  <section class="settings-view" aria-labelledby="settings-title" data-settings-view>
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
      <button v-if="update" type="button" @click="actions.openUpdate(update.url)">
        {{ update.version }}
      </button>
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
