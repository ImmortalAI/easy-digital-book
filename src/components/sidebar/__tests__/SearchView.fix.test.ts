import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createI18nPlugin } from "@/plugins/i18n";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import SearchView from "@/components/sidebar/SearchView.vue";

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

describe("SearchView review contracts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    installBook();
  });

  it("keeps an invalid regex error visible and localized", async () => {
    const wrapper = mount(SearchView, { global: { plugins: [createI18nPlugin("ru")] } });
    await wrapper.get('input[type="search"]').setValue("[");
    await wrapper.get('[data-search-option="regex"]').setValue(true);

    expect(wrapper.find(".search-error").text()).toContain("Неверное регулярное выражение");
    wrapper.unmount();
  });

  it("groups results by chapter, exposes counts, hides a group, and passes the range on select", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");

    expect(wrapper.findAll("[data-search-group]")).toHaveLength(2);
    expect(wrapper.findAll("[data-search-count]").map((item) => item.text())).toEqual(["2", "1"]);
    await wrapper.find('[data-search-group="chapter1"] [data-search-collapse]').trigger("click");
    expect(wrapper.findAll('[data-search-group="chapter1"] .search-result')).toHaveLength(0);
    await wrapper.find('[data-search-group="chapter2"] .search-result button').trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["chapter2", 9, 13]);
    wrapper.unmount();
  });

  it("hides a result group instead of merely collapsing it", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");

    await wrapper.find('[data-search-group="chapter1"] [data-search-hide]').trigger("click");

    const hiddenGroup = wrapper.find('[data-search-group="chapter1"]');
    expect(hiddenGroup.exists()).toBe(false);
    expect(wrapper.find('[data-search-group="chapter2"] [data-search-hide]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("toggles replacement preview and supports replace chapter/all keyboard action", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    await wrapper.get("[data-replace-toggle]").trigger("click");
    expect(wrapper.findAll(".replacement-preview")).toHaveLength(3);
    await wrapper.get('[data-replace-chapter="chapter1"]').trigger("click");
    expect(useProjectStore().book?.chapters[0]?.source).toContain("villain villain");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", altKey: true, ctrlKey: true }),
    );
    await wrapper.vm.$nextTick();
    expect(useProjectStore().book?.chapters[1]?.source).toBe("# Second\nvillain");
  });
});
