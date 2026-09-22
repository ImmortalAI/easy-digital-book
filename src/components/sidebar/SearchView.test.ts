import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import SearchView from "@/components/sidebar/SearchView.vue";

describe("SearchView", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("renders book matches and replaces one selected match", async () => {
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date(),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    book.chapters[0]!.source = "hero hero";
    project.setBook(book);
    const wrapper = mount(SearchView);
    await wrapper.get('input[type="search"]').setValue("hero");
    await wrapper.get('input[placeholder="Replace"]').setValue("villain");
    expect(wrapper.findAll(".search-result")).toHaveLength(2);
    await wrapper.find(".search-result button[aria-label='Replace']").trigger("click");
    expect(project.book?.chapters[0]?.source).toBe("villain hero");
  });
});
