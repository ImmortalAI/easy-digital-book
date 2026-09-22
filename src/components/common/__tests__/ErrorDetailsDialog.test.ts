import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ErrorDetailsDialog from "@/components/common/ErrorDetailsDialog.vue";
import type { ErrorActions } from "@/composables/use-error-actions";

describe("ErrorDetailsDialog", () => {
  it("uses a finite localized fallback instead of displaying an unknown raw error", () => {
    const actions: ErrorActions = {
      copyDetails: vi.fn<ErrorActions["copyDetails"]>(),
      openLogs: vi.fn<ErrorActions["openLogs"]>(),
      reportIssue: vi.fn<ErrorActions["reportIssue"]>(),
    };
    const wrapper = mount(ErrorDetailsDialog, {
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

    expect(wrapper.get("h2").text()).not.toContain("platform.secret-origin-message");
    expect(wrapper.get("h2").text()).not.toContain("safe");
  });
});
