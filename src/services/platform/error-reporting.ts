import { AppError } from "@/types/errors";
import type { Logger } from "@/types/platform";

export interface UnexpectedErrorReport {
  code: string;
  name: string;
  details: string;
  issueUrl: string;
}

export function errorTranslationKey(code: string): string {
  if (code === "export.cancelled" || code === "export.noProject" || code === "export.failed")
    return `errors.${code}`;
  if (code.startsWith("updates.")) return "errors.updates";
  if (code.startsWith("platform.")) return "errors.platform";
  return "errors.unexpected";
}

export function reportUnexpectedError(
  error: unknown,
  logger: Logger,
  context: { version?: string; platform?: string } = {},
): UnexpectedErrorReport {
  const appError = error instanceof AppError ? error : null;
  const code = appError?.code ?? "unexpected";
  const name = error instanceof Error ? error.name : "UnknownError";
  const stack = error instanceof Error ? error.stack?.split("\n").slice(1).join("\n") : "";
  const details = [
    `code=${code}`,
    `name=${name}`,
    `version=${context.version ?? "unknown"}`,
    `platform=${context.platform ?? globalThis.navigator?.platform ?? "unknown"}`,
    stack,
  ]
    .filter(Boolean)
    .join("\n");
  logger.error("Unexpected application error", { code, name });
  const issueBody = `${details}\n\nPlease describe what happened without including book contents.`;
  return {
    code,
    name,
    details,
    issueUrl: `https://github.com/alex/easy-digital-book/issues/new?${new URLSearchParams({ title: `[${code}] Unexpected application error`, body: issueBody }).toString()}`,
  };
}
