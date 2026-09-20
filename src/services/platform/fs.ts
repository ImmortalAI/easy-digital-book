import { exists, readFile, stat, writeFile } from "@tauri-apps/plugin-fs";
import { appErrorFromUnknown } from "@/types/errors";
import type { FileSystem } from "@/types/platform";

const adapt = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw appErrorFromUnknown(error, "platform.fs");
  }
};
export const tauriFileSystem: FileSystem = {
  readFile: (path) => adapt(() => readFile(path)),
  writeFile: (path, bytes) => adapt(() => writeFile(path, bytes)),
  exists: (path) => adapt(() => exists(path)),
  stat: async (path) => {
    const info = await adapt(() => stat(path));
    return { mtime: info.mtime?.getTime() ?? null, size: info.size };
  },
};
