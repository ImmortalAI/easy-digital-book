import { defineStore } from "pinia";
import { ref } from "vue";
import type { SettingsRepository } from "@/types/platform";
export interface ExportSettings {
  titlePage: boolean;
}
export const useSettingsStore = defineStore("settings", () => {
  const confirmDelete = ref(true),
    recentFiles = ref<string[]>([]),
    exportSettings = ref<ExportSettings>({ titlePage: true });
  let repository: SettingsRepository | undefined;
  function configure(value: SettingsRepository) {
    repository = value;
  }
  async function load() {
    confirmDelete.value = (await repository?.get("confirmDelete", true)) ?? true;
    recentFiles.value = ((await repository?.get("recentFiles", [])) ?? []).slice(0, 10);
    exportSettings.value = (await repository?.get("export", { titlePage: true })) ?? {
      titlePage: true,
    };
  }
  async function persist() {
    await repository?.set("confirmDelete", confirmDelete.value);
    await repository?.set("recentFiles", recentFiles.value);
    await repository?.set("export", exportSettings.value);
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
    configure,
    load,
    persist,
    addRecent,
    removeRecent,
  };
});
