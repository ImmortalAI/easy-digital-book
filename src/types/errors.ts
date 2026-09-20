export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export function appErrorFromUnknown(error: unknown, fallbackCode = "platform.unknown"): AppError {
  if (error instanceof AppError) return error;
  const value =
    error && typeof error === "object" ? (error as { code?: unknown; message?: unknown }) : {};
  const code = typeof value.code === "string" ? value.code : fallbackCode;
  const message =
    typeof value.message === "string" ? value.message : "An unexpected platform error occurred";
  return new AppError(code, message);
}
