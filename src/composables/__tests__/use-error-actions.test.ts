import { describe, expect, it, vi } from "vitest";
import { createInMemoryPlatformServices } from "@/services/platform";
import { createErrorActions } from "@/composables/use-error-actions";

describe("error actions", () => {
  it("keeps clipboard, logs, and issue links behind the composable boundary", async () => {
    const services = createInMemoryPlatformServices();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const actions = createErrorActions(services);
    const report = {
      code: "unexpected",
      name: "Error",
      details: "safe",
      issueUrl: "https://example.test",
    };

    await actions.copyDetails(report);
    await actions.openLogs();
    await actions.reportIssue(report);

    expect(writeText).toHaveBeenCalledWith("safe");
    expect(services.opener.open).toBeDefined();
  });
});
