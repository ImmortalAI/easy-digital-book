import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { within } from "@testing-library/vue";
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

/** A chapter's result group, named after the chapter's title as the explorer shows it. */
function resultGroup(wrapper: VueWrapper, title: string): HTMLElement {
  return within(wrapper.element as HTMLElement).getByRole("group", { name: title });
}
/** The group header's collapse trigger carries the chapter title as its name. */
function collapseTrigger(wrapper: VueWrapper, title: string): HTMLElement {
  return within(resultGroup(wrapper, title)).getByRole("button", { name: title });
}
/**
 * Every result row has a Hide button of its own; the header's comes first in
 * document order, ahead of the rows in the collapsible content.
 */
function hideGroupButton(wrapper: VueWrapper, title: string): HTMLElement {
  return within(resultGroup(wrapper, title)).getAllByRole("button", { name: "Hide" })[0]!;
}
function replaceChapterButton(wrapper: VueWrapper, title: string): HTMLElement {
  return within(resultGroup(wrapper, title)).getByRole("button", { name: "Replace chapter" });
}
/** Clicks and lets the collapsible's presence settle before the next query. */
async function click(element: HTMLElement) {
  element.click();
  await flushPromises();
}
function button(wrapper: VueWrapper, name: string): HTMLElement {
  return within(wrapper.element as HTMLElement).getByRole("button", { name });
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

    expect(within(wrapper.element as HTMLElement).getByRole("alert")).toHaveTextContent(
      "Неверное регулярное выражение",
    );
    wrapper.unmount();
  });

  it("counts results and chapters in the translated summary", async () => {
    const wrapper = mount(SearchView, { global: { plugins: [createI18nPlugin("en")] } });
    await wrapper.get('input[type="search"]').setValue("hero");

    expect(wrapper.text()).toContain("3 results in 2 chapters");
    wrapper.unmount();
  });

  it("groups results by chapter, exposes counts, hides a group, and passes the range on select", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");

    expect(within(resultGroup(wrapper, "First")).getByText("2")).toBeTruthy();
    expect(within(resultGroup(wrapper, "Second")).getByText("1")).toBeTruthy();
    await click(collapseTrigger(wrapper, "First"));
    expect(
      within(resultGroup(wrapper, "First")).queryAllByRole("button", { name: "Replace" }),
    ).toHaveLength(0);
    await click(within(resultGroup(wrapper, "Second")).getByRole("button", { name: /hero/ }));
    expect(wrapper.emitted("select")?.[0]).toEqual(["chapter2", 9, 13]);
    wrapper.unmount();
  });

  it("hides a result group instead of merely collapsing it", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");

    await click(hideGroupButton(wrapper, "First"));

    const groups = within(wrapper.element as HTMLElement);
    expect(groups.queryByRole("group", { name: "First" })).toBeNull();
    expect(groups.getByRole("group", { name: "Second" })).toBeTruthy();
    wrapper.unmount();
  });

  it("excludes hidden groups and hidden results from replace all", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    await click(button(wrapper, "Show replace"));

    // Hiding is the user excluding something from the operation.
    await click(hideGroupButton(wrapper, "Second"));
    // The first Hide is the header's; the second belongs to the first result.
    await click(within(resultGroup(wrapper, "First")).getAllByRole("button", { name: "Hide" })[1]!);
    await click(button(wrapper, "Replace all"));

    const chapters = useProjectStore().book!.chapters;
    expect(chapters[1]!.source).toBe("# Second\nhero");
    expect(chapters[0]!.source).toBe("# First\nhero villain");
    wrapper.unmount();
  });

  it("names a chapter with a blank first line the way the explorer does", async () => {
    useProjectStore().book!.chapters[1]!.source = "\nhero";
    const wrapper = mount(SearchView, { global: { plugins: [createI18nPlugin("ru")] } });
    await wrapper.get('input[type="search"]').setValue("hero");

    // An empty first line used to leave both the group and its header nameless.
    expect(resultGroup(wrapper, "Глава 2")).toBeTruthy();
    expect(collapseTrigger(wrapper, "Глава 2")).toBeTruthy();
    wrapper.unmount();
  });

  it("keeps replace all available when every group is merely collapsed", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    await click(button(wrapper, "Show replace"));

    for (const title of ["First", "Second"]) await click(collapseTrigger(wrapper, title));

    // Collapsing is a fold, not an exclusion.
    expect(button(wrapper, "Replace all")).toBeEnabled();
    await click(button(wrapper, "Replace all"));
    expect(useProjectStore().book?.chapters[1]?.source).toBe("# Second\nvillain");
    wrapper.unmount();
  });

  it("toggles replacement preview and supports replace chapter/all keyboard action", async () => {
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    await click(button(wrapper, "Show replace"));
    expect(within(wrapper.element as HTMLElement).getAllByText("villain")).toHaveLength(3);
    await click(replaceChapterButton(wrapper, "First"));
    expect(useProjectStore().book?.chapters[0]?.source).toContain("villain villain");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", altKey: true, ctrlKey: true }),
    );
    await wrapper.vm.$nextTick();
    expect(useProjectStore().book?.chapters[1]?.source).toBe("# Second\nvillain");
    wrapper.unmount();
  });
});
