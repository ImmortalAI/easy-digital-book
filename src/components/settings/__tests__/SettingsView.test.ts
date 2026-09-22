import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsView from "@/components/settings/SettingsView.vue";
import { createInMemoryPlatformServices } from "@/services/platform";
import { useSettingsStore } from "@/stores/settings";

describe("SettingsView", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("persists the selected locale through SettingsStore", async () => {
    const services = createInMemoryPlatformServices();
    const settings = useSettingsStore();
    settings.configure(services.settings);
    const wrapper = mount(SettingsView, { props: { services, settings } });

    await wrapper.get('[data-setting="locale"] select').setValue("ru");

    expect(settings.locale).toBe("ru");
    expect(await services.settings.get("locale", null)).toBe("ru");
  });

  it("checks for updates at most once per day and logs network failures", async () => {
    const services = createInMemoryPlatformServices();
    const settings = useSettingsStore();
    settings.configure(services.settings);
    const check = vi.spyOn(services.updates, "check");
    const wrapper = mount(SettingsView, { props: { services, settings } });
    expect(wrapper.find("[data-check-updates]").exists()).toBe(true);
    expect(settings.updates.lastCheckedAt).toBeNull();

    await wrapper.get("[data-check-updates]").trigger("click");
    expect(settings.updates.lastCheckedAt).not.toBeNull();
    await vi.waitFor(() => expect(check).toHaveBeenCalledOnce());
    await wrapper.get("[data-check-updates]").trigger("click");

    expect(check).toHaveBeenCalledOnce();
  });
});
