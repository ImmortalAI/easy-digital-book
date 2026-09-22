import { defineStore } from "pinia";
import { ref } from "vue";
import type { SettingsRepository } from "@/types/platform";
import type { SupportedLocale } from "@/plugins/i18n";
export interface ExportSettings {
  imagePreset: "kindle-paperwhite" | "original";
  grayscale: boolean;
  titlePage: boolean;
  versionInTitle: boolean;
  lastDir: string | null;
}
export interface UpdateSettings {
  lastCheckedAt: number | null;
}
const defaultExport: ExportSettings = {
  imagePreset: "kindle-paperwhite",
  grayscale: false,
  titlePage: true,
  versionInTitle: true,
  lastDir: null,
};
export const useSettingsStore = defineStore("settings", () => {
  const confirmDelete = ref(true),
    recentFiles = ref<string[]>([]),
    exportSettings = ref<ExportSettings>({ ...defaultExport }),
    locale = ref<SupportedLocale | null>(null),
    updates = ref<UpdateSettings>({ lastCheckedAt: null });
  let repository: SettingsRepository | undefined;
  function configure(value: SettingsRepository) {
    repository = value;
  }
  async function load() {
    confirmDelete.value = (await repository?.get("confirmDelete", true)) ?? true;
    recentFiles.value = ((await repository?.get("recentFiles", [])) ?? []).slice(0, 10);
    exportSettings.value = {
      ...defaultExport,
      ...(await repository?.get<Partial<ExportSettings>>("export", {})),
    };
    locale.value = (await repository?.get<SupportedLocale | null>("locale", null)) ?? null;
    const updateSettings = await repository?.get<Partial<UpdateSettings>>("updates", {});
    updates.value = {
      lastCheckedAt:
        updateSettings?.lastCheckedAt ??
        (await repository?.get<number | null>("updates.lastCheckedAt", null)) ??
        null,
    };
  }
  async function persist() {
    await repository?.set("confirmDelete", confirmDelete.value);
    await repository?.set("recentFiles", recentFiles.value);
    await repository?.set("export", exportSettings.value);
    await repository?.set("locale", locale.value);
    await repository?.set("updates", updates.value);
    await repository?.set("updates.lastCheckedAt", updates.value.lastCheckedAt);
  }
  async function addRecent(path: string) {
    recentFiles.value = [path, ...recentFiles.value.filter((item) => item !== path)].slice(0, 10);
    await repository?.set("recentFiles", recentFiles.value);
  }
  async function removeRecent(path: string) {
    recentFiles.value = recentFiles.value.filter((item) => item !== path);
    await repository?.set("recentFiles", recentFiles.value);
  }
  return {
    confirmDelete,
    recentFiles,
    exportSettings,
    locale,
    updates,
    configure,
    load,
    persist,
    addRecent,
    removeRecent,
  };
});
