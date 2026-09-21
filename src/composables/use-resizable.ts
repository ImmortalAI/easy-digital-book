import { onScopeDispose } from "vue";

export const SIDEBAR_MIN = 160;
export const SIDEBAR_MAX = 400;
export const PANE_MIN = 240;

export function clampSidebarWidth(value: number): number {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)));
}

export function resizePane(
  start: number,
  delta: number,
  total: number,
  minimum = PANE_MIN,
): number {
  const maximum = Math.max(minimum, total - minimum);
  return Math.min(maximum, Math.max(minimum, Math.round(start + delta)));
}

export function clampSplitRatio(ratio: number, total: number, minimum = PANE_MIN): number {
  if (total <= minimum * 2) return 0.5;
  const lower = minimum / total;
  return Math.min(1 - lower, Math.max(lower, ratio));
}

interface ResizableOptions {
  getContainerWidth: () => number;
  getSidebarWidth: () => number;
  setSidebarWidth: (value: number) => void;
  getSplitRatio: () => number;
  setSplitRatio: (value: number) => void;
  persist?: () => void | Promise<void>;
}

type ResizeKind = "sidebar" | "content";

export function useResizable(options: ResizableOptions) {
  let active: {
    kind: ResizeKind;
    pointerId: number;
    startX: number;
    startSidebarWidth: number;
    startRatio: number;
  } | null = null;

  function removePointerListeners() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  }

  const stop = (event?: PointerEvent) => {
    if (!active || (event && event.pointerId !== active.pointerId)) return;
    active = null;
    removePointerListeners();
    void options.persist?.();
  };

  const move = (event: PointerEvent) => {
    if (!active || event.pointerId !== active.pointerId) return;
    const delta = event.clientX - active.startX;
    if (active.kind === "sidebar") {
      options.setSidebarWidth(clampSidebarWidth(active.startSidebarWidth + delta));
      return;
    }
    const width = Math.max(options.getContainerWidth() - options.getSidebarWidth(), PANE_MIN * 2);
    options.setSplitRatio(clampSplitRatio(active.startRatio + delta / width, width, PANE_MIN));
  };

  function begin(kind: ResizeKind, event: PointerEvent) {
    const target = event.currentTarget as HTMLElement | null;
    active = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startSidebarWidth: options.getSidebarWidth(),
      startRatio: options.getSplitRatio(),
    };
    target?.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  function resetSplit() {
    options.setSplitRatio(0.5);
    void options.persist?.();
  }

  onScopeDispose(() => {
    active = null;
    removePointerListeners();
  });

  return { begin, resetSplit };
}
