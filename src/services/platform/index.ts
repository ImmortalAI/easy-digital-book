import type { FileSystem, PlatformServices, SettingsRepository } from "@/types/platform";
import { createRecoveryStore } from "./recovery";
import { tauriDialogs } from "./dialogs";
import { tauriFileSystem } from "./fs";
import { tauriLogger } from "./logger";
import { tauriOpener } from "./opener";
import { tauriSettings } from "./settings";
import { noUpdates } from "./updates";

export const platformServices: PlatformServices = {
  files: tauriFileSystem,
  dialogs: tauriDialogs,
  settings: tauriSettings,
  recovery: createRecoveryStore(tauriLogger),
  logger: tauriLogger,
  opener: tauriOpener,
  updates: noUpdates,
};

class MemoryFiles implements FileSystem {
  readonly data = new Map<string, Uint8Array>();
  async readFile(path: string) {
    const bytes = this.data.get(path);
    if (!bytes) throw new Error("File not found");
    return new Uint8Array(bytes);
  }
  async writeFile(path: string, bytes: Uint8Array) {
    this.data.set(path, new Uint8Array(bytes));
  }
  async exists(path: string) {
    return this.data.has(path);
  }
  async stat(path: string) {
    return { mtime: null, size: this.data.get(path)?.byteLength ?? 0 };
  }
}
class MemorySettings implements SettingsRepository {
  readonly data = new Map<string, unknown>();
  async get<T>(key: string, fallback: T) {
    return (this.data.get(key) as T | undefined) ?? fallback;
  }
  async set<T>(key: string, value: T) {
    this.data.set(key, value);
  }
  async remove(key: string) {
    this.data.delete(key);
  }
}
export function createInMemoryPlatformServices(): PlatformServices {
  const files = new MemoryFiles();
  const settings = new MemorySettings();
  const logger = { debug() {}, info() {}, warn() {}, error() {} };
  return {
    files,
    settings,
    dialogs: {
      async open() {
        return null;
      },
      async save() {
        return null;
      },
      async confirm() {
        return false;
      },
      async message() {},
    },
    recovery: createRecoveryStore(logger),
    logger,
    opener: { async reveal() {}, async open() {} },
    updates: noUpdates,
  };
}

export * from "./recovery";
export * from "./image-processor";
