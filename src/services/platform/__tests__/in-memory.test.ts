import { describe, expect, it } from "vitest";
import { createInMemoryPlatformServices } from "../index";

describe("in-memory platform dialogs", () => {
  it("returns deterministic project and EPUB paths for e2e adapters", async () => {
    const services = createInMemoryPlatformServices({
      dialogPaths: { project: "/memory/book.edb", epub: "/memory/book.epub" },
      confirm: true,
    });

    await expect(
      services.dialogs.save({ filters: [{ name: "EPUB", extensions: ["epub"] }] }),
    ).resolves.toBe("/memory/book.epub");
    await expect(
      services.dialogs.save({ filters: [{ name: "EDB", extensions: ["edb"] }] }),
    ).resolves.toBe("/memory/book.edb");
    await expect(services.dialogs.open()).resolves.toBe("/memory/book.edb");
    await expect(services.dialogs.confirm("delete")).resolves.toBe(true);
  });
});
