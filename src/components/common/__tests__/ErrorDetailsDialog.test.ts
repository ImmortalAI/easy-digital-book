import { render, screen } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";
import ErrorDetailsDialog from "@/components/common/ErrorDetailsDialog.vue";
import type { ErrorActions } from "@/composables/use-error-actions";

describe("ErrorDetailsDialog", () => {
  it("uses a finite localized fallback instead of displaying an unknown raw error", async () => {
    const actions: ErrorActions = {
      copyDetails: vi.fn<ErrorActions["copyDetails"]>(),
      openLogs: vi.fn<ErrorActions["openLogs"]>(),
      reportIssue: vi.fn<ErrorActions["reportIssue"]>(),
    };
    render(ErrorDetailsDialog, {
      props: {
        report: {
          code: "platform.secret-origin-message",
          name: "Error",
          details: "safe",
          issueUrl: "https://example.test",
        },
        actions,
      },
    });

    // ErrorDetailsDialog now teleports its content to document.body (Dialog's
    // portal), so it is queried through testing-library's document-wide screen
    // rather than a mounted wrapper's tree.
    const heading = await screen.findByRole("heading");
    expect(heading.textContent).not.toContain("platform.secret-origin-message");
    expect(heading.textContent).not.toContain("safe");
  });
});
