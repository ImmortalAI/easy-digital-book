import { confirm, message, open, save } from "@tauri-apps/plugin-dialog";
import { appErrorFromUnknown } from "@/types/errors";
import type { Dialogs } from "@/types/platform";
const adapt = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw appErrorFromUnknown(error, "platform.dialog");
  }
};
export const tauriDialogs: Dialogs = {
  open: (options) =>
    adapt(async () => {
      const result = await open(options);
      return typeof result === "string" ? result : null;
    }),
  save: (options) => adapt(() => save(options)),
  confirm: (text, title) => adapt(() => confirm(text, title)),
  message: (text, title) =>
    adapt(async () => {
      await message(text, title);
    }),
};
