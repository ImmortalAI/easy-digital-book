import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import { createI18nPlugin } from "@/plugins/i18n";
import { useLayoutStore } from "@/stores/layout";

describe("AppToolbar", () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });
  afterEach(cleanup);

  it("switches modes and disables them outside chapter and css views", async () => {
    const layout = useLayoutStore();
    render(AppToolbar, { global: { plugins: [pinia] } });
    const text = screen.getByRole("radio", { name: /text/i });
    await userEvent.click(text);
    expect(layout.mode).toBe("text");

    layout.center = { kind: "metadata" };
    await nextTick();
    expect(text).toBeDisabled();
  });

  it("moves between modes with the arrow keys", async () => {
    render(AppToolbar, { global: { plugins: [pinia] } });
    screen.getByRole("radio", { name: /text/i }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toHaveAccessibleName(/split/i);
  });

  it("keeps the current mode selected when it is clicked again", async () => {
    const layout = useLayoutStore();
    render(AppToolbar, { global: { plugins: [pinia] } });
    const split = screen.getByRole("radio", { name: /split/i });
    expect(split).toHaveAttribute("aria-checked", "true");

    await userEvent.click(split);
    expect(layout.mode).toBe("split");
    expect(split).toHaveAttribute("aria-checked", "true");
  });

  it("lets modified keys reach the global shortcut handler", async () => {
    render(AppToolbar, { global: { plugins: [pinia] } });
    const seen: KeyboardEvent[] = [];
    const listener = (event: KeyboardEvent) => seen.push(event);
    window.addEventListener("keydown", listener);
    try {
      screen.getByRole("radio", { name: /text/i }).focus();
      await userEvent.keyboard("{Control>}1{/Control}");
      await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");
    } finally {
      window.removeEventListener("keydown", listener);
    }
    const modified = seen.filter((event) => event.ctrlKey && event.key !== "Control");
    expect(modified.map((event) => [event.key, event.defaultPrevented])).toEqual([
      ["1", false],
      ["ArrowRight", false],
    ]);
    expect(document.activeElement).toHaveAccessibleName(/text/i);
  });

  it("names the toolbar and the mode group in the interface language", () => {
    render(AppToolbar, { global: { plugins: [pinia, createI18nPlugin("zh-CN")] } });
    expect(screen.getByRole("toolbar", { name: "编辑器模式" })).toBeInTheDocument();
    expect(screen.getByLabelText("预览模式")).toBeInTheDocument();
  });

  it("relabels the modes when the interface language changes live", async () => {
    const i18n = createI18nPlugin("en");
    render(AppToolbar, { global: { plugins: [pinia, i18n] } });
    expect(screen.getByRole("radio", { name: /^Preview/ })).toBeInTheDocument();

    i18n.global.locale.value = "ru";
    await nextTick();
    expect(screen.getByRole("radio", { name: /^Превью/ })).toBeInTheDocument();
  });

  it("emits export from the export button", async () => {
    const { emitted } = render(AppToolbar, { global: { plugins: [pinia] } });
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(emitted().export).toHaveLength(1);
  });
});
