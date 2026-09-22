export type GlobalErrorTarget = Pick<Window, "onerror" | "onunhandledrejection">;

export function installGlobalErrorHandlers(
  report: (error: unknown) => void,
  target: GlobalErrorTarget = window,
): void {
  target.onerror = (_message, _source, _line, _column, error) => {
    report(error ?? new Error("window error"));
    return true;
  };
  target.onunhandledrejection = (event) => {
    report(event.reason);
    event.preventDefault();
  };
}
