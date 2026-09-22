import { appLogDir } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { appErrorFromUnknown } from "@/types/errors";
import type { LogServices } from "@/types/platform";

export const tauriLogs: LogServices = {
  async openDirectory() {
    try {
      await openPath(await appLogDir());
    } catch (error) {
      throw appErrorFromUnknown(error, "platform.logs");
    }
  },
};
