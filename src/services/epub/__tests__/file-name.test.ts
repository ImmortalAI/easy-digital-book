import { describe, expect, it } from "vitest";
import { makeEpubFileName } from "@/services/epub/file-name";

describe("makeEpubFileName", () => {
  it("sanitizes Windows reserved names", () => {
    expect(makeEpubFileName({ title: "CON", version: null }, false)).toBe("_CON.epub");
  });
  it("adds version and caps the basename at 120 characters", () => {
    const name = makeEpubFileName({ title: `${"a".repeat(130)}<>`, version: "v1" }, true);
    expect(name.endsWith(".epub")).toBe(true);
    expect(name.slice(0, -5).length).toBeLessThanOrEqual(120);
  });
  it("replaces Unicode control characters and trims after truncation", () => {
    const name = makeEpubFileName(
      { title: `${"a".repeat(119)}. ` + String.fromCharCode(0x85), version: null },
      false,
    );
    expect(name).toBe(`${"a".repeat(119)}.epub`);
  });
});
