import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function runChecker(output: string): Promise<number> {
  const directory = await mkdtemp(join(tmpdir(), "edb-epubcheck-"));
  const executable = join(directory, "epubcheck");
  const input = join(directory, "fixture.epub");
  await writeFile(executable, '#!/bin/sh\nprintf "%s\\n" "$EPUBCHECK_OUTPUT"\n');
  await chmod(executable, 0o755);
  await writeFile(input, "fixture");
  try {
    await execFileAsync("bash", ["scripts/epubcheck.sh", input], {
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, EPUBCHECK_OUTPUT: output },
    });
    return 0;
  } catch (error) {
    return (error as { code?: number }).code ?? 1;
  }
}

describe("epubcheck wrapper", () => {
  it("accepts zero-warning summaries and rejects actual warning diagnostics", async () => {
    await expect(runChecker("No errors or warnings detected.")).resolves.toBe(0);
    await expect(runChecker("WARNING(RSC-005): bad resource")).resolves.toBe(1);
    await expect(runChecker("(1) warnings and (0) errors detected.")).resolves.toBe(1);
  });
});
