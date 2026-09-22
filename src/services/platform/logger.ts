import { debug, error, info, warn } from "@tauri-apps/plugin-log";
import type { Logger } from "@/types/platform";
function safeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (/source|content|metadata|resource|bytes|description|title/i.test(key)) {
      result[key] = "[redacted]";
    } else if (value instanceof Error) {
      result[key] = { name: value.name };
    } else if (["string", "number", "boolean"].includes(typeof value) || value === null) {
      result[key] = value;
    } else {
      result[key] = "[omitted]";
    }
  }
  return result;
}
const write = (
  fn: (message: string) => Promise<void>,
  message: string,
  details?: Record<string, unknown>,
) => {
  const safe = safeDetails(details);
  void fn(safe ? `${message} ${JSON.stringify(safe)}` : message);
};
export const tauriLogger: Logger = {
  debug: (m, d) => write(debug, m, d),
  info: (m, d) => write(info, m, d),
  warn: (m, d) => write(warn, m, d),
  error: (m, d) => write(error, m, d),
};
