import { createPinia, setActivePinia } from "pinia";
import { mount, type VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createI18nPlugin } from "@/plugins/i18n";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import SearchView from "@/components/sidebar/SearchView.vue";
import { resetChapterEditors } from "@/components/editor/editor-commands";

function installBook() {
  const project = useProjectStore();
  const book = createBook({
    locale: "en",
    now: new Date(),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });
  book.chapters[0]!.source = "# First\nhero hero";
  book.chapters.push({ id: "chapter2", source: "# Second\nhero" });
  project.setBook(book);
}

/**
 * The group header always renders the CollapsibleTrigger first, followed by
 * the count badge, the Hide button and (when replacement is open) the
 * "Replace chapter" button — so the collapse trigger is reliably the header's
 * first button regardless of which optional buttons are showing.
 */
function collapseTrigger(wrapper: VueWrapper, chapterId: string) {
  const button = wrapper.findAll(`[data-search-group="${chapterId}"] header button`)[0];
  if (!button) throw new Error(`Expected a collapse trigger in ${chapterId}`);
  return button;
}
function hideGroupButton(wrapper: VueWrapper, chapterId: string) {
  return wrapper.get(`[data-search-group="${chapterId}"] header button[aria-label="Hide"]`);
}
function replaceChapterButton(wrapper: VueWrapper, chapterId: string) {
  const button = wrapper
    .findAll(`[data-search-group="${chapterId}"] header button`)
    .find((el) => el.text().includes("Replace chapter"));
  if (!button) throw new Error(`Expected a "Replace chapter" button in ${chapterId}`);
  return button;
}

describe("SearchView review contracts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Editor states are module-level singletons; a replace in one test would
    // otherwise be the starting document of the next one.
    resetChapterEditors();
    installBook();
  });

  it("keeps an invalid regex error visible and localized", async () => {
    const wrapper = mount(SearchView, { global: { plugins: [createI18nPlugin("ru")] } });
    await wrapper.get('input[type="search"]').setValue("[");
    await wrapper.get('button[aria-label="Регулярное выражение"]').trigger("click");

    expect(wrapper.find(".search-error").text()).toContain("Неверное регулярное выражение");
    wrapper.unmount();
  });

  it("groups results by chapter, exposes counts, hides a group, and passes the range on select", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");

    expect(wrapper.findAll("[data-search-group]")).toHaveLength(2);
    expect(wrapper.findAll("[data-search-count]").map((item) => item.text())).toEqual(["2", "1"]);
    await collapseTrigger(wrapper, "chapter1").trigger("click");
    expect(wrapper.findAll('[data-search-group="chapter1"] .search-result')).toHaveLength(0);
    await wrapper.find('[data-search-group="chapter2"] .search-result button').trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["chapter2", 9, 13]);
    wrapper.unmount();
  });

  it("hides a result group instead of merely collapsing it", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");

    await hideGroupButton(wrapper, "chapter1").trigger("click");

    const hiddenGroup = wrapper.find('[data-search-group="chapter1"]');
    expect(hiddenGroup.exists()).toBe(false);
    expect(wrapper.find('[data-search-group="chapter2"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("excludes hidden groups and hidden results from replace all", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    await wrapper.get("[data-replace-toggle]").trigger("click");

    // Hiding is the user excluding something from the operation.
    await hideGroupButton(wrapper, "chapter2").trigger("click");
    await wrapper
      .find('[data-search-group="chapter1"] .search-result button[aria-label="Hide"]')
      .trigger("click");
    await wrapper.get("[data-replace-all]").trigger("click");

    const chapters = useProjectStore().book!.chapters;
    expect(chapters[1]!.source).toBe("# Second\nhero");
    expect(chapters[0]!.source).toBe("# First\nhero villain");
    wrapper.unmount();
  });

  it("keeps replace all available when every group is merely collapsed", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    await wrapper.get("[data-replace-toggle]").trigger("click");

    for (const id of ["chapter1", "chapter2"]) await collapseTrigger(wrapper, id).trigger("click");

    // Collapsing is a fold, not an exclusion.
    expect(wrapper.get("[data-replace-all]").attributes("disabled")).toBeUndefined();
    await wrapper.get("[data-replace-all]").trigger("click");
    expect(useProjectStore().book?.chapters[1]?.source).toBe("# Second\nvillain");
    wrapper.unmount();
  });

  it("toggles replacement preview and supports replace chapter/all keyboard action", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    await wrapper.get("[data-replace-toggle]").trigger("click");
    expect(wrapper.findAll(".replacement-preview")).toHaveLength(3);
    await replaceChapterButton(wrapper, "chapter1").trigger("click");
    expect(useProjectStore().book?.chapters[0]?.source).toContain("villain villain");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", altKey: true, ctrlKey: true }),
    );
    await wrapper.vm.$nextTick();
    expect(useProjectStore().book?.chapters[1]?.source).toBe("# Second\nvillain");
  });
});
