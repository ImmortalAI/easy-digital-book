import { describe, expect, it } from "vitest";
import { clampSidebarWidth, clampSplitRatio, resizePane } from "@/composables/use-resizable";

describe("useResizable constraints", () => {
  it("keeps the sidebar between 160px and 400px", () => {
    expect(clampSidebarWidth(10)).toBe(160);
    expect(clampSidebarWidth(250)).toBe(250);
    expect(clampSidebarWidth(999)).toBe(400);
  });

  it("keeps source and preview at least 240px wide", () => {
    expect(resizePane(250, -100, 1000)).toBe(240);
    expect(clampSplitRatio(0, 1000)).toBe(0.24);
    expect(clampSplitRatio(1, 1000)).toBe(0.76);
  });

  it("resets the split to an even ratio", () => {
    expect(clampSplitRatio(0.5, 1000)).toBe(0.5);
  });
});
