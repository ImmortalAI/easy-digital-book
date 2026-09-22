import { load, type Store } from "@tauri-apps/plugin-store";
import { appErrorFromUnknown } from "@/types/errors";
import type { SettingsRepository } from "@/types/platform";
let storePromise: Promise<Store> | undefined;
const store = () => (storePromise ??= load("settings.json", { autoSave: true }));
const adapt = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw appErrorFromUnknown(error, "platform.settings");
  }
};
export const tauriSettings: SettingsRepository = {
  get: (key, fallback) =>
    adapt(async () => (await (await store()).get<typeof fallback>(key)) ?? fallback),
  set: (key, value) =>
    adapt(() =>
      (async () => {
        await (await store()).set(key, value);
      })(),
    ),
  remove: (key) =>
    adapt(() =>
      (async () => {
        await (await store()).delete(key);
      })(),
    ),
};
