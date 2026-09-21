import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/App.vue";
import { createI18nPlugin } from "@/plugins/i18n";
import { createBook } from "@/services/book/create";
import { useLayoutStore } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";

describe("App shell", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("switches from welcome to the editor and reflects center breadcrumbs", async () => {
    const wrapper = mount(App, { global: { plugins: [createI18nPlugin("en")] } });
    expect(wrapper.find(".editor-shell").exists()).toBe(false);

    useProjectStore().setBook(
      createBook({
        locale: "en",
        now: new Date("2026-01-01"),
        newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
        newChapterId: () => "chapter1",
      }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".editor-shell").exists()).toBe(true);

    useLayoutStore().center = { kind: "metadata" };
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".breadcrumbs").text()).toBe("Метаданные");
  });
});
