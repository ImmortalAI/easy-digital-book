import { describe, expect, it, vi } from "vitest";
import { installGlobalErrorHandlers } from "@/services/platform/global-errors";

describe("global error handlers", () => {
  it("reports errors and suppresses browser default logging", () => {
    const report = vi.fn<(error: unknown) => void>();
    const target = { onerror: null, onunhandledrejection: null } as unknown as Window;
    installGlobalErrorHandlers(report, target);

    expect(target.onerror?.("source", "", 1, 1, new Error("book text"))).toBe(true);
    const preventDefault = vi.fn<() => void>();
    target.onunhandledrejection?.({
      reason: new Error("book text"),
      preventDefault,
    } as unknown as PromiseRejectionEvent);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledTimes(2);
  });
});
