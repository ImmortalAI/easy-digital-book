import { describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useTheme } from "@/composables/use-theme";
import { useSettingsStore } from "@/stores/settings";

describe("useTheme", () => {
  it("applies the stored choice and falls back to the OS preference", async () => {
    setActivePinia(createPinia());
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("dark"),
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    }));

    const theme = useTheme();
    await nextTick();
    // "system" with an OS preferring dark resolves to dark.
    expect(theme.resolved.value).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await theme.setTheme("light");
    await nextTick();
    expect(theme.resolved.value).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(useSettingsStore().theme).toBe("light");
  });
});
