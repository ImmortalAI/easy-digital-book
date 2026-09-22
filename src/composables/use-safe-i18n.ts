import { getCurrentInstance } from "vue";
export function useSafeI18n() {
  const translate = getCurrentInstance()?.appContext.config.globalProperties.$t as
    | ((key: string) => string)
    | undefined;
  return { t: (key: string, fallback: string) => translate?.(key) ?? fallback };
}
