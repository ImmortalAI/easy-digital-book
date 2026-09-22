import { describe, expect, it, vi } from "vitest";
import { createUnsavedGuard } from "../use-unsaved-guard";

describe("unsaved guard", () => {
  it("cancels the requested action without saving", async () => {
    const save = vi.fn<() => Promise<boolean>>();
    const guard = createUnsavedGuard({
      isDirty: () => true,
      save,
      requestDecision: async () => "cancel",
    });

    await expect(guard.guard("open")).resolves.toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it("allows the action after a successful save", async () => {
    const save = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const guard = createUnsavedGuard({
      isDirty: () => true,
      save,
      requestDecision: async () => "save",
    });

    await expect(guard.guard("close")).resolves.toBe(true);
    expect(save).toHaveBeenCalledOnce();
  });

  it("keeps the action blocked when saving fails", async () => {
    const save = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const guard = createUnsavedGuard({
      isDirty: () => true,
      save,
      requestDecision: async () => "save",
    });

    await expect(guard.guard("new")).resolves.toBe(false);
  });
});
