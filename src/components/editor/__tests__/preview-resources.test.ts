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

  it("does not read resource bytes when re-syncing an unchanged project", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:one");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const cache = createResourceUrlCache();
    const resource = { mediaType: "image/png" as const, bytes: new Uint8Array(1024) };
    cache.sync(new Map([["images/big.png", resource]]));

    // renderPreview re-syncs on every parse result, i.e. while typing, and
    // mutations carry unchanged resources over by reference. Walking the
    // buffers there costs the whole image payload per keystroke.
    const scan = vi.spyOn(Uint8Array.prototype, "every");
    cache.sync(new Map([["images/big.png", resource]]));
    cache.sync(new Map([["images/big.png", resource]]));

    expect(scan).not.toHaveBeenCalled();
  });

  it("issues a new URL when a resource is actually replaced", () => {
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:one")
      .mockReturnValueOnce("blob:two");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const cache = createResourceUrlCache();
    cache.sync(
      new Map([["images/a.png", { mediaType: "image/png" as const, bytes: new Uint8Array([1]) }]]),
    );
    cache.sync(
      new Map([["images/a.png", { mediaType: "image/png" as const, bytes: new Uint8Array([2]) }]]),
    );

    expect(createUrl).toHaveBeenCalledTimes(2);
    expect(cache.resolve("images/a.png")).toBe("blob:two");
  });
});
