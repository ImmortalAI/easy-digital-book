import { computed, watchEffect } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { useSettingsStore } from "@/stores/settings";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const settings = useSettingsStore();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const resolved = computed<"light" | "dark">(() =>
    settings.theme === "system" ? (prefersDark.value ? "dark" : "light") : settings.theme,
  );

  watchEffect(() => {
    document.documentElement.classList.toggle("dark", resolved.value === "dark");
  });

  async function setTheme(value: Theme) {
    settings.theme = value;
    await settings.persist();
  }

  return { theme: computed(() => settings.theme), resolved, setTheme };
}
