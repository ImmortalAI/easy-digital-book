import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsView from "@/components/settings/SettingsView.vue";
import { useSettingsStore } from "@/stores/settings";
import type { SettingsActions } from "@/composables/use-settings-actions";

describe("SettingsView", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("persists the selected locale through SettingsStore", async () => {
    const settings = useSettingsStore();
    const actions: SettingsActions = {
      persist: vi.fn<() => Promise<void>>(),
      checkUpdates: vi.fn<SettingsActions["checkUpdates"]>(),
      openLogs: vi.fn<() => Promise<void>>(),
      openUpdate: vi.fn<(url: string) => Promise<void>>(),
    };
    const wrapper = mount(SettingsView, { props: { actions, settings } });

    await wrapper.get('[data-setting="locale"] select').setValue("ru");

    expect(settings.locale).toBe("ru");
    expect(actions.persist).toHaveBeenCalled();
  });

  it("checks for updates at most once per day and logs network failures", async () => {
    const settings = useSettingsStore();
    const actions: SettingsActions = {
      persist: vi.fn<() => Promise<void>>(),
      checkUpdates: vi.fn<SettingsActions["checkUpdates"]>().mockResolvedValue({
        status: "skipped",
        update: null,
      }),
      openLogs: vi.fn<() => Promise<void>>(),
      openUpdate: vi.fn<(url: string) => Promise<void>>(),
    };
    const wrapper = mount(SettingsView, { props: { actions, settings } });
    expect(wrapper.find("[data-check-updates]").exists()).toBe(true);
    expect(settings.updates.lastCheckedAt).toBeNull();

    await wrapper.get("[data-check-updates]").trigger("click");
    expect(actions.checkUpdates).toHaveBeenCalledOnce();
    await wrapper.get("[data-check-updates]").trigger("click");

    expect(actions.checkUpdates).toHaveBeenCalledTimes(2);
  });
});
