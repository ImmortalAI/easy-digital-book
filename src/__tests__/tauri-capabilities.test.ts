import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tauri window capability", () => {
  it("allows destruction after an approved close request", async () => {
    const file = resolve(process.cwd(), "src-tauri/capabilities/default.json");
    const capability = JSON.parse(await readFile(file, "utf8")) as { permissions: string[] };

    expect(capability.permissions).toContain("core:window:allow-destroy");
  });
});
