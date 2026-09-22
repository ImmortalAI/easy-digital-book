import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import WelcomeView from "@/views/WelcomeView.vue";
import { createI18nPlugin } from "@/plugins/i18n";
import { createInMemoryPlatformServices } from "@/services/platform";
import { createProjectFiles, projectFilesKey } from "@/composables/use-project-files";

describe("WelcomeView", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("starts a new project from the welcome action", async () => {
    const files = createProjectFiles({
      services: createInMemoryPlatformServices(),
      locale: "en",
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    const wrapper = mount(WelcomeView, {
      global: {
        plugins: [createI18nPlugin("en")],
        provide: { [projectFilesKey as symbol]: files },
      },
    });

    await wrapper.get('[data-action="new-project"]').trigger("click");
    expect(files.project.book).not.toBeNull();
    wrapper.unmount();
  });
});
