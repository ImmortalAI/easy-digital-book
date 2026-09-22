import { getCurrentInstance } from "vue";
export function useSafeI18n() {
  const instance = getCurrentInstance();
  const translate = instance?.appContext.config.globalProperties.$t as
    | ((key: string, params?: unknown) => string)
    | undefined;
  const locale = instance?.appContext.config.globalProperties.$i18n as
    | { locale?: { value: string } }
    | undefined;
  return {
    currentLocale: locale?.locale?.value ?? "en",
    t: (key: string, fallback: string, params?: unknown) => {
      const translated = translate?.(key, params);
      return translated && translated !== key ? translated : fallback;
    },
    setLocale: (value: string) => {
      if (locale?.locale) locale.locale.value = value;
    },
  };
}
