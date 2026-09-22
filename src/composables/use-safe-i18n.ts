import { getCurrentInstance } from "vue";
export function useSafeI18n() {
  const instance = getCurrentInstance();
  const translate = instance?.appContext.config.globalProperties.$t as
    | ((key: string, params?: unknown) => string)
    | undefined;
  // With `legacy: false`, $i18n.locale is a writable string accessor that
  // proxies the global Composer's ref — not a ref itself. Treating it as one
  // read undefined, and assigning `.value` to a string primitive threw
  // "Cannot create property 'value' on string" under module strict mode.
  const i18n = instance?.appContext.config.globalProperties.$i18n as
    | { locale?: string }
    | undefined;
  return {
    currentLocale: i18n?.locale ?? "en",
    t: (key: string, fallback: string, params?: unknown) => {
      const translated = translate?.(key, params);
      return translated && translated !== key ? translated : fallback;
    },
    setLocale: (value: string) => {
      if (i18n && typeof i18n.locale === "string") i18n.locale = value;
    },
  };
}
