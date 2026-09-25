import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorDetailsDialog from "@/components/common/ErrorDetailsDialog.vue";
import type { ErrorActions } from "@/composables/use-error-actions";
import type { UnexpectedErrorReport } from "@/services/platform/error-reporting";

const makeActions = (): ErrorActions => ({
  copyDetails: vi.fn<ErrorActions["copyDetails"]>(),
  openLogs: vi.fn<ErrorActions["openLogs"]>(),
  reportIssue: vi.fn<ErrorActions["reportIssue"]>(),
});
const makeReport = (details: string): UnexpectedErrorReport => ({
  code: "unexpected",
  name: "Error",
  details,
  issueUrl: "https://example.test",
});

describe("ErrorDetailsDialog", () => {
  afterEach(cleanup);

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

  it("stays closed until there is a report", () => {
    render(ErrorDetailsDialog, { props: { report: null, actions: makeActions() } });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("forgets the copied confirmation when a new report replaces the old one", async () => {
    const { rerender } = render(ErrorDetailsDialog, {
      props: { report: makeReport("first"), actions: makeActions() },
    });
    await userEvent.click(await screen.findByRole("button", { name: "Copy details" }));
    expect(screen.getByRole("status")).toHaveTextContent("Details copied");

    await rerender({ report: makeReport("second") });

    expect(screen.getByText("second")).toBeInTheDocument();
    expect(screen.queryByText("Details copied")).not.toBeInTheDocument();
  });

  it("asks to close, then opens again for the next report", async () => {
    const { emitted, rerender } = render(ErrorDetailsDialog, {
      props: { report: makeReport("first"), actions: makeActions() },
    });
    await userEvent.click(await screen.findByRole("button", { name: "Close" }));
    expect(emitted("close")).toHaveLength(1);

    await rerender({ report: null });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await rerender({ report: makeReport("second") });
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("second");
  });
});
