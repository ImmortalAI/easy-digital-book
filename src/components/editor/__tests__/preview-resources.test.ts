import { beforeEach, describe, expect, it, vi } from "vitest";
import { createResourceUrlCache } from "@/components/editor/preview-resources";

describe("preview resource URL cache", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reuses unchanged URLs and revokes removed/project resources", () => {
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:one");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const cache = createResourceUrlCache();
    const resources = new Map([
      ["images/cover.png", { mediaType: "image/png" as const, bytes: new Uint8Array([1]) }],
    ]);

    cache.sync(resources);
    cache.sync(resources);
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(cache.resolve("images/cover.png")).toBe("blob:one");

    cache.sync(new Map());
    expect(revokeUrl).toHaveBeenCalledWith("blob:one");
    cache.releaseAll();
    expect(revokeUrl).toHaveBeenCalledTimes(1);
  });
});
