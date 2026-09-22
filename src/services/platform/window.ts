import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { appErrorFromUnknown } from "@/types/errors";
import type { WindowServices } from "@/types/platform";

const adapt = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw appErrorFromUnknown(error, "platform.window");
  }
};

export const tauriWindow: WindowServices = {
  listenOpenPaths: (handler) =>
    adapt(async () => {
      const unlisten = await listen("open-paths", () => handler());
      return unlisten;
    }),
  takePendingOpenPaths: () => adapt(() => invoke<string[]>("take_pending_open_paths")),
  onCloseRequested: (handler) => adapt(() => getCurrentWindow().onCloseRequested(handler)),
};
