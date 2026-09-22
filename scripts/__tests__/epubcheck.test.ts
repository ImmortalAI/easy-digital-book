import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function runChecker(
  output: string,
  jarName = "epubcheck-5.2.1.jar",
  includePathExecutable = false,
): Promise<number> {
  const directory = await mkdtemp(join(tmpdir(), "edb-epubcheck-"));
  const java = join(directory, "java");
  const jar = join(directory, jarName);
  const input = join(directory, "fixture.epub");
  await writeFile(java, '#!/bin/sh\nprintf "%s\\n" "$EPUBCHECK_OUTPUT"\n');
  await chmod(java, 0o755);
  if (includePathExecutable) {
    const executable = join(directory, "epubcheck");
    await writeFile(executable, '#!/bin/sh\nprintf "%s\\n" "$EPUBCHECK_OUTPUT"\n');
    await chmod(executable, 0o755);
  }
  await writeFile(jar, "fixture jar");
  await writeFile(input, "fixture");
  try {
    await execFileAsync("bash", ["scripts/epubcheck.sh", input], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        EPUBCHECK_JAR: jar,
        EPUBCHECK_OUTPUT: output,
      },
    });
    return 0;
  } catch (error) {
    return (error as { code?: number }).code ?? 1;
  }
}

describe("epubcheck wrapper", () => {
  it("uses the pinned jar and rejects PATH executables or mismatched jar names", async () => {
    await expect(
      runChecker("No errors or warnings detected.", "epubcheck-5.2.0.jar"),
    ).resolves.toBe(1);
    await expect(
      runChecker("No errors or warnings detected.", "epubcheck-5.2.0.jar", true),
    ).resolves.toBe(1);
  });

  it("accepts zero-warning summaries and rejects actual warning diagnostics", async () => {
    await expect(runChecker("No errors or warnings detected.")).resolves.toBe(0);
    await expect(runChecker("WARNING(RSC-005): bad resource")).resolves.toBe(1);
    await expect(runChecker("(1) warnings and (0) errors detected.")).resolves.toBe(1);
  });
});
