import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "@/assets/style.css";
import { createI18nPlugin, type SupportedLocale } from "@/plugins/i18n";
import { platformServices, setRuntimePlatformServices } from "@/services/platform";

const supportedLocales: SupportedLocale[] = ["ru", "en", "zh-CN"];
const browserLocale = navigator.language;
const initialLocale =
  supportedLocales.find((locale) => browserLocale === locale) ??
  supportedLocales.find((locale) => browserLocale.startsWith(`${locale}-`)) ??
  "en";

setRuntimePlatformServices(platformServices);
createApp(App).use(createPinia()).use(createI18nPlugin(initialLocale)).mount("#app");
