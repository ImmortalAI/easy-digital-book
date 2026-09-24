import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AppToolbar from "@/components/layout/AppToolbar.vue";
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
    const wrapper = mount(AppToolbar);
    await wrapper.get('[data-mode="text"]').trigger("click");
    expect(layout.mode).toBe("text");

    layout.center = { kind: "metadata" };
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-mode="text"]').attributes("disabled")).toBeDefined();
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

  it("emits export from the export button", async () => {
    const { emitted } = render(AppToolbar, { global: { plugins: [pinia] } });
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(emitted().export).toHaveLength(1);
  });
});
