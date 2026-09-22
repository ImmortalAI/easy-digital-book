import { ref, type Ref } from "vue";

export type UnsavedAction = "new" | "open" | "close";
export type UnsavedDecision = "save" | "discard" | "cancel";

export interface UnsavedGuardOptions {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  requestDecision: (action: UnsavedAction) => Promise<UnsavedDecision>;
}

export interface UnsavedGuard {
  guard(action: UnsavedAction): Promise<boolean>;
}

export function createUnsavedGuard(options: UnsavedGuardOptions): UnsavedGuard {
  return {
    async guard(action) {
      if (!options.isDirty()) return true;
      const decision = await options.requestDecision(action);
      if (decision === "discard") return true;
      if (decision !== "save") return false;
      try {
        return await options.save();
      } catch {
        return false;
      }
    },
  };
}

export interface UnsavedPrompt {
  pending: Ref<UnsavedAction | null>;
  requestDecision: (action: UnsavedAction) => Promise<UnsavedDecision>;
  choose: (decision: UnsavedDecision) => void;
}

export function useUnsavedGuard(): UnsavedPrompt {
  const pending = ref<UnsavedAction | null>(null);
  let resolvePending: ((decision: UnsavedDecision) => void) | undefined;

  function requestDecision(action: UnsavedAction): Promise<UnsavedDecision> {
    if (resolvePending) resolvePending("cancel");
    pending.value = action;
    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  function choose(decision: UnsavedDecision): void {
    const resolve = resolvePending;
    resolvePending = undefined;
    pending.value = null;
    resolve?.(decision);
  }

  return { pending, requestDecision, choose };
}
