import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";

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

/** Builds a real jar whose manifest declares a Class-Path, as the release does. */
async function runWithManifestJar({
  createLib,
}: {
  createLib: boolean;
}): Promise<{ code: number; stderr: string }> {
  const directory = await mkdtemp(join(tmpdir(), "edb-epubcheck-jar-"));
  const java = join(directory, "java");
  await writeFile(java, '#!/bin/sh\nprintf "%s\\n" "$EPUBCHECK_OUTPUT"\n');
  await chmod(java, 0o755);

  const zip = new JSZip();
  zip.file(
    "META-INF/MANIFEST.MF",
    "Manifest-Version: 1.0\r\nClass-Path: lib/icu4j-72.1.jar lib/galimatias-0.1.3.jar\r\n\r\n",
  );
  const jar = join(directory, "epubcheck-5.2.1.jar");
  await writeFile(jar, await zip.generateAsync({ type: "nodebuffer" }));
  if (createLib) {
    await mkdir(join(directory, "lib"), { recursive: true });
    for (const name of ["icu4j-72.1.jar", "galimatias-0.1.3.jar"])
      await writeFile(join(directory, "lib", name), "dependency");
  }

  const input = join(directory, "fixture.epub");
  await writeFile(input, "fixture");
  try {
    await execFileAsync("bash", ["scripts/epubcheck.sh", input], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        EPUBCHECK_JAR: jar,
        EPUBCHECK_OUTPUT: "No errors or warnings detected.",
      },
    });
    return { code: 0, stderr: "" };
  } catch (error) {
    const failure = error as { code?: number; stderr?: string };
    return { code: failure.code ?? 1, stderr: failure.stderr ?? "" };
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

  it("refuses a jar installed without the lib directory it declares", async () => {
    // The released jar is thin: its manifest lists lib/*.jar beside it. Copying
    // the jar alone left java to die with NoClassDefFoundError deep in a trace.
    const withLib = await runWithManifestJar({ createLib: true });
    expect(withLib.code).toBe(0);

    const withoutLib = await runWithManifestJar({ createLib: false });
    expect(withoutLib.code).toBe(1);
    expect(withoutLib.stderr).toContain("missing 2 of its dependencies");
    expect(withoutLib.stderr).toContain("lib/icu4j-72.1.jar");
    expect(withoutLib.stderr).toContain("not just the jar");
  });
});
