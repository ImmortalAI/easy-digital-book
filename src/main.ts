import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "@/assets/style.css";
import { createI18nPlugin, type SupportedLocale } from "@/plugins/i18n";
import { platformServices, setRuntimePlatformServices } from "@/services/platform";
import { reportUnexpectedError } from "@/services/platform/error-reporting";
import { installGlobalErrorHandlers } from "@/services/platform/global-errors";

const supportedLocales: SupportedLocale[] = ["ru", "en", "zh-CN"];
setRuntimePlatformServices(platformServices);

function browserLocale(): SupportedLocale {
  const value = navigator.language;
  return (
    supportedLocales.find((locale) => value === locale) ??
    supportedLocales.find((locale) => value.startsWith(`${locale}-`)) ??
    "en"
  );
}

function report(error: unknown) {
  const details = reportUnexpectedError(error, platformServices.logger, { version: "0.1.0" });
  window.dispatchEvent(new CustomEvent("edb-unexpected-error", { detail: details }));
}

export async function bootstrap() {
  let initialLocale = browserLocale();
  try {
    const saved = await platformServices.settings.get<SupportedLocale | null>("locale", null);
    if (saved && supportedLocales.includes(saved)) initialLocale = saved;
  } catch {
    platformServices.logger.warn("Could not load interface locale", { code: "settings.locale" });
  }
  const app = createApp(App);
  app.config.errorHandler = (error) => report(error);
  installGlobalErrorHandlers(report);
  app.use(createPinia()).use(createI18nPlugin(initialLocale)).mount("#app");
}

void bootstrap().catch(report);
