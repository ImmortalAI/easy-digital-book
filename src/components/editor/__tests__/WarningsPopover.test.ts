import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import WarningsPopover from "@/components/editor/WarningsPopover.vue";
import { useDiagnosticsStore } from "@/stores/diagnostics";
import { createI18nPlugin } from "@/plugins/i18n";

describe("WarningsPopover", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("groups current chapter diagnostics separately from book warnings", async () => {
    const diagnostics = useDiagnosticsStore();
    diagnostics.setChapterDiagnostics("chapter1", [
      { severity: "warning", message: "NovLang warning" },
    ]);
    diagnostics.setBookWarnings([{ code: "book.cover", message: "Missing cover" }]);
    const wrapper = mount(WarningsPopover, {
      props: { chapterId: "chapter1" },
      global: { plugins: [createI18nPlugin("en")] },
    });

    await wrapper.get("[data-warnings-trigger]").trigger("click");

    const groups = wrapper.findAll("h3").map((item) => item.text());
    expect(groups).toEqual(["Current chapter", "Book"]);
    expect(wrapper.text()).toContain("NovLang warning");
    expect(wrapper.text()).toContain("Missing cover");
    expect(wrapper.get("[data-warnings-trigger]").text()).toContain("2");
  });

  it("localizes empty warning groups", async () => {
    const wrapper = mount(WarningsPopover, {
      props: { chapterId: "chapter1" },
      global: { plugins: [createI18nPlugin("en")] },
    });

    await wrapper.get("[data-warnings-trigger]").trigger("click");

    expect(wrapper.text()).toContain("No warnings");
  });
});
