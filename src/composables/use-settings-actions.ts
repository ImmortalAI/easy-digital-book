import { appErrorFromUnknown } from "@/types/errors";
import type { UpdateInfo, PlatformServices } from "@/types/platform";
import type { useSettingsStore } from "@/stores/settings";

export type UpdateCheckResult =
  | { status: "skipped"; update: null }
  | { status: "checked"; update: UpdateInfo | null }
  | { status: "failed"; update: null };

export interface SettingsActions {
  persist(): Promise<void>;
  checkUpdates(): Promise<UpdateCheckResult>;
  openLogs(): Promise<void>;
  openUpdate(url: string): Promise<void>;
}

interface SettingsActionsOptions {
  settings: ReturnType<typeof useSettingsStore>;
  services?: PlatformServices;
  now?: () => number;
}

const day = 24 * 60 * 60 * 1000;

export function createSettingsActions(options: SettingsActionsOptions): SettingsActions {
  const now = options.now ?? Date.now;

  async function persist(): Promise<void> {
    await options.settings.persist();
  }

  async function checkUpdates(): Promise<UpdateCheckResult> {
    const timestamp = now();
    const lastCheckedAt = options.settings.updates.lastCheckedAt;
    if (lastCheckedAt !== null && timestamp - lastCheckedAt < day)
      return { status: "skipped", update: null };

    options.settings.updates.lastCheckedAt = timestamp;
    await persist();
    if (!options.services) return { status: "checked", update: null };
    try {
      return { status: "checked", update: (await options.services.updates.check()) || null };
    } catch (error) {
      options.services.logger.warn("Update check failed", {
        code: appErrorFromUnknown(error, "updates.network").code,
      });
      return { status: "failed", update: null };
    }
  }

  async function openLogs(): Promise<void> {
    if (!options.services) return;
    try {
      await options.services.logs.openDirectory();
    } catch (error) {
      options.services.logger.warn("Could not open log directory", {
        code: appErrorFromUnknown(error, "platform.logs").code,
      });
    }
  }

  async function openUpdate(url: string): Promise<void> {
    if (!options.services) return;
    try {
      await options.services.opener.open(url);
    } catch (error) {
      options.services.logger.warn("Could not open update page", {
        code: appErrorFromUnknown(error, "platform.opener").code,
      });
    }
  }

  return { persist, checkUpdates, openLogs, openUpdate };
}
