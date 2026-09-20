import { debug, error, info, warn } from "@tauri-apps/plugin-log";
import type { Logger } from "@/types/platform";
const write = (
  fn: (message: string) => Promise<void>,
  message: string,
  details?: Record<string, unknown>,
) => {
  void fn(details ? `${message} ${JSON.stringify(details)}` : message);
};
export const tauriLogger: Logger = {
  debug: (m, d) => write(debug, m, d),
  info: (m, d) => write(info, m, d),
  warn: (m, d) => write(warn, m, d),
  error: (m, d) => write(error, m, d),
};
