export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly params?: Record<string, unknown>;
  readonly cause?: unknown;
  constructor(
    code: string,
    message: string,
    details?: unknown,
    options?: { params?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.params =
      options?.params ??
      (details && typeof details === "object" && !Array.isArray(details)
        ? (details as Record<string, unknown>)
        : undefined);
    this.cause = options?.cause;
  }
}

export function appErrorFromUnknown(error: unknown, fallbackCode = "platform.unknown"): AppError {
  if (error instanceof AppError) return error;
  const value =
    error && typeof error === "object" ? (error as { code?: unknown; message?: unknown }) : {};
  const code = typeof value.code === "string" ? value.code : fallbackCode;
  const message =
    typeof value.message === "string" ? value.message : "An unexpected platform error occurred";
  return new AppError(code, message, undefined, { cause: error });
}
