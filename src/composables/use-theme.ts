import { computed, watchEffect } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { useSettingsStore } from "@/stores/settings";

export type Theme = "light" | "dark" | "system";

/** The theme in effect: the stored choice, or the OS preference for "system". */
export function useResolvedTheme() {
  const settings = useSettingsStore();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  return computed<"light" | "dark">(() =>
    settings.theme === "system" ? (prefersDark.value ? "dark" : "light") : settings.theme,
  );
}

/** Applies the resolved theme to <html>. Called once, at app start-up. */
export function useTheme() {
  const settings = useSettingsStore();
  const resolved = useResolvedTheme();

  watchEffect(() => {
    document.documentElement.classList.toggle("dark", resolved.value === "dark");
  });

  return { theme: computed(() => settings.theme), resolved };
}
