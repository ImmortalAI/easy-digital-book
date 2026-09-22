import { describe, expect, it, vi } from "vitest";
import { reportUnexpectedError } from "@/services/platform/error-reporting";
import type { Logger } from "@/types/platform";

describe("unexpected error reporting", () => {
  it("keeps source text out of logs and generated issue URLs", () => {
    const source = "SECRET BOOK SOURCE";
    const logger = {
      debug: vi.fn<Logger["debug"]>(),
      info: vi.fn<Logger["info"]>(),
      warn: vi.fn<Logger["warn"]>(),
      error: vi.fn<Logger["error"]>(),
    } satisfies Logger;

    const report = reportUnexpectedError(new Error(source), logger);

    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(source);
    expect(report.issueUrl).not.toContain(encodeURIComponent(source));
    expect(report.code).toBe("unexpected");
  });
});
