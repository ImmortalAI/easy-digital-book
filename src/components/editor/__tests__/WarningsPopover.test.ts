import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import WarningsPopover from "@/components/editor/WarningsPopover.vue";
import { useDiagnosticsStore } from "@/stores/diagnostics";

describe("WarningsPopover", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("groups current chapter diagnostics separately from book warnings", async () => {
    const diagnostics = useDiagnosticsStore();
    diagnostics.setChapterDiagnostics("chapter1", [
      { severity: "warning", message: "NovLang warning" },
    ]);
    diagnostics.setBookWarnings([{ code: "book.cover", message: "Missing cover" }]);
    const wrapper = mount(WarningsPopover, { props: { chapterId: "chapter1" } });

    await wrapper.get("[data-warnings-trigger]").trigger("click");

    const groups = wrapper.findAll("h3").map((item) => item.text());
    expect(groups).toEqual(["Эта глава", "Книга"]);
    expect(wrapper.text()).toContain("NovLang warning");
    expect(wrapper.text()).toContain("Missing cover");
    expect(wrapper.get("[data-warnings-trigger]").text()).toContain("2");
  });
});
