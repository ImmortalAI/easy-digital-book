import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { appErrorFromUnknown } from "@/types/errors";
import type { Opener } from "@/types/platform";
const adapt = async (run: () => Promise<void>) => {
  try {
    await run();
  } catch (error) {
    throw appErrorFromUnknown(error, "platform.opener");
  }
};
export const tauriOpener: Opener = {
  reveal: (path) => adapt(() => revealItemInDir(path)),
  open: (path) => adapt(() => openPath(path)),
};
