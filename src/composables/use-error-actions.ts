import type { UnexpectedErrorReport } from "@/services/platform/error-reporting";
import { appErrorFromUnknown } from "@/types/errors";
import type { PlatformServices } from "@/types/platform";

export interface ErrorActions {
  copyDetails(report: UnexpectedErrorReport): Promise<void>;
  openLogs(): Promise<void>;
  reportIssue(report: UnexpectedErrorReport): Promise<void>;
}

export function createErrorActions(services: PlatformServices): ErrorActions {
  async function copyDetails(report: UnexpectedErrorReport): Promise<void> {
    try {
      await navigator.clipboard?.writeText(report.details);
    } catch (error) {
      services.logger.warn("Could not copy error details", {
        code: appErrorFromUnknown(error, "platform.clipboard").code,
      });
    }
  }

  async function openLogs(): Promise<void> {
    try {
      await services.logs.openDirectory();
    } catch (error) {
      services.logger.warn("Could not open log directory", {
        code: appErrorFromUnknown(error, "platform.logs").code,
      });
    }
  }

  async function reportIssue(report: UnexpectedErrorReport): Promise<void> {
    try {
      await services.opener.open(report.issueUrl);
    } catch (error) {
      services.logger.warn("Could not open issue reporter", {
        code: appErrorFromUnknown(error, "platform.opener").code,
      });
    }
  }

  return { copyDetails, openLogs, reportIssue };
}
