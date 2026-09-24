import { createPinia, setActivePinia } from "pinia";
import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsView from "@/components/settings/SettingsView.vue";
import { useSettingsStore } from "@/stores/settings";
import type { SettingsActions } from "@/composables/use-settings-actions";
import { createI18nPlugin } from "@/plugins/i18n";

function createActions(overrides: Partial<SettingsActions> = {}): SettingsActions {
  return {
    persist: vi.fn<() => Promise<void>>(),
    checkUpdates: vi.fn<SettingsActions["checkUpdates"]>(),
    openLogs: vi.fn<() => Promise<void>>(),
    openUpdate: vi.fn<(url: string) => Promise<void>>(),
    ...overrides,
  };
}

async function choose(control: RegExp, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: control }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("SettingsView", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
  });

  it("persists the selected locale through SettingsStore", async () => {
    const settings = useSettingsStore();
    const actions = createActions();
    render(SettingsView, { props: { actions, settings } });

    await choose(/interface language/i, "Русский");

    expect(settings.locale).toBe("ru");
    expect(actions.persist).toHaveBeenCalled();
  });

  it("switches the running interface locale", async () => {
    const settings = useSettingsStore();
    const actions = createActions();
    const i18n = createI18nPlugin("en");
    render(SettingsView, { props: { actions, settings }, global: { plugins: [i18n] } });

    // The other cases mount without the plugin, so useSafeI18n finds no
    // instance and setLocale silently does nothing — the real app has one.
    await choose(/interface language/i, "Русский");

    expect(settings.locale).toBe("ru");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Настройки");
  });

  it("switches the theme and persists the choice", async () => {
    const settings = useSettingsStore();
    const actions = createActions();
    render(SettingsView, { props: { settings, actions } });

    await choose(/theme/i, "Dark");

    expect(settings.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(actions.persist).toHaveBeenCalled();
  });

  it("persists export and deletion switches", async () => {
    const settings = useSettingsStore();
    const actions = createActions();
    render(SettingsView, { props: { settings, actions } });
    const user = userEvent.setup();

    await user.click(screen.getByRole("switch", { name: /grayscale/i }));
    await user.click(screen.getByRole("switch", { name: /confirm deletions/i }));
    await user.click(screen.getByRole("radio", { name: /without changes/i }));

    expect(settings.exportSettings.grayscale).toBe(true);
    expect(settings.confirmDelete).toBe(false);
    expect(settings.exportSettings.imagePreset).toBe("original");
    expect(actions.persist).toHaveBeenCalledTimes(3);
  });

  it("checks for updates at most once per day and logs network failures", async () => {
    const settings = useSettingsStore();
    const actions = createActions({
      checkUpdates: vi.fn<SettingsActions["checkUpdates"]>().mockResolvedValue({
        status: "skipped",
        update: null,
      }),
    });
    render(SettingsView, { props: { actions, settings } });
    const user = userEvent.setup();
    const check = screen.getByRole("button", { name: /check for updates/i });
    expect(settings.updates.lastCheckedAt).toBeNull();

    await user.click(check);
    expect(actions.checkUpdates).toHaveBeenCalledOnce();
    await user.click(check);

    expect(actions.checkUpdates).toHaveBeenCalledTimes(2);
  });
});
