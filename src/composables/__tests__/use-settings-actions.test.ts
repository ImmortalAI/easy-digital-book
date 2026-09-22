import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryPlatformServices } from "@/services/platform";
import { createSettingsActions } from "@/composables/use-settings-actions";
import { useSettingsStore } from "@/stores/settings";
import { createPinia, setActivePinia } from "pinia";

describe("settings actions", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("owns update, log, and external-open platform operations outside Vue components", async () => {
    const services = createInMemoryPlatformServices();
    const settings = useSettingsStore();
    settings.configure(services.settings);
    const actions = createSettingsActions({ services, settings, now: () => 1000 });
    const check = vi.spyOn(services.updates, "check").mockResolvedValue({
      version: "2.0.0",
      url: "https://example.test/release",
    });
    const openLogs = vi.spyOn(services.logs, "openDirectory");
    const openUpdate = vi.spyOn(services.opener, "open");

    await expect(actions.checkUpdates()).resolves.toEqual({
      status: "checked",
      update: { version: "2.0.0", url: "https://example.test/release" },
    });
    await actions.openLogs();
    await actions.openUpdate("https://example.test/release");

    expect(check).toHaveBeenCalledOnce();
    expect(openLogs).toHaveBeenCalledOnce();
    expect(openUpdate).toHaveBeenCalledWith("https://example.test/release");
  });
});
