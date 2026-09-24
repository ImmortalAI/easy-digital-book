import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import SearchView from "@/components/sidebar/SearchView.vue";

describe("SearchView", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

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

  it("names the search options and the replace toggle", async () => {
    render(SearchView, { global: { plugins: [pinia] } });
    await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "hero");
    await userEvent.click(screen.getByRole("button", { name: /show replace/i }));
    expect(screen.getByRole("textbox", { name: /replace/i })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /match case/i }));
    expect(screen.getByRole("button", { name: /match case/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
