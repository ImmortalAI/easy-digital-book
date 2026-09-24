import { createI18n } from "vue-i18n";
import en from "@/locales/en.json";
import ru from "@/locales/ru.json";
import zhCN from "@/locales/zh-CN.json";
import { pluralRu } from "@/utils/plural";

export type SupportedLocale = "ru" | "en" | "zh-CN";

export function createI18nPlugin(initialLocale: SupportedLocale) {
  return createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: "en",
    messages: { en, ru, "zh-CN": zhCN },
    // Russian messages list three forms: one | few | many.
    pluralRules: { ru: (choice: number) => Number(pluralRu(choice, "0", "1", "2")) },
  });
}
