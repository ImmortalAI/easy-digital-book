import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { createI18nPlugin } from "@/plugins/i18n";

function harness() {
  let api!: ReturnType<typeof useSafeI18n>;
  const component = defineComponent({
    setup() {
      api = useSafeI18n();
      return () => h("p", api.t("settings.title", "Settings"));
    },
  });
  return { component, read: () => api };
}

describe("useSafeI18n", () => {
  it("reports and switches the locale of a real i18n instance", async () => {
    const { component, read } = harness();
    const wrapper = mount(component, { global: { plugins: [createI18nPlugin("en")] } });

    expect(read().currentLocale).toBe("en");
    expect(wrapper.text()).toBe("Settings");

    read().setLocale("ru");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toBe("Настройки");
    wrapper.unmount();
  });

  it("starts from the locale the instance was created with", () => {
    const { component, read } = harness();
    const wrapper = mount(component, { global: { plugins: [createI18nPlugin("zh-CN")] } });

    expect(read().currentLocale).toBe("zh-CN");
    wrapper.unmount();
  });

  it("falls back to the given text and stays silent without an i18n instance", () => {
    const { component, read } = harness();
    const wrapper = mount(component);

    expect(wrapper.text()).toBe("Settings");
    expect(read().currentLocale).toBe("en");
    expect(() => read().setLocale("ru")).not.toThrow();
    wrapper.unmount();
  });
});
