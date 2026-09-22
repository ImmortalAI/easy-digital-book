import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractChangelogSection } from "../release-notes.mts";
import { assertReleaseTag } from "../verify-release-tag.mts";

const workflow = await readFile(".github/workflows/release.yml", "utf8");
const e2eConfig = await readFile("e2e/playwright.config.ts", "utf8");
const e2eSpec = await readFile("e2e/app.spec.ts", "utf8");

describe("release workflow", () => {
  it("installs architecture targets separately from the universal Tauri target", () => {
    expect(workflow).toContain("aarch64-apple-darwin,x86_64-apple-darwin");
    expect(workflow).toContain("--target ${{ matrix.tauri_target }}");
    expect(workflow).not.toContain("targets: ${{ matrix.tauri_target }}");
  });

  it("installs the Ubuntu Tauri bundling dependencies", () => {
    for (const dependency of [
      "libwebkit2gtk-4.1-dev",
      "libappindicator3-dev",
      "librsvg2-dev",
      "patchelf",
    ]) {
      expect(workflow).toContain(dependency);
    }
  });

  it("has secret-gated Windows certificate import, config, and cleanup", () => {
    expect(workflow).toContain("Import-PfxCertificate");
    expect(workflow).toContain("certificateThumbprint");
    expect(workflow).toContain("GITHUB_OUTPUT");
    expect(workflow).toContain("Clean up Windows signing material");
    expect(workflow).toContain("Remove-Item -Recurse -Force");
  });

  it("checks the tag and publishes the matching changelog section", () => {
    expect(workflow).toContain("verify:release-tag");
    expect(workflow).toContain("release-notes");
    expect(workflow).toContain("steps.release-notes.outputs.body");
    expect(() => assertReleaseTag("v0.1.0", "0.1.0")).not.toThrow();
    expect(() => assertReleaseTag("v0.2.0", "0.1.0")).toThrow(/must match/);
    expect(
      extractChangelogSection(
        "# Changelog\n\n## [0.1.0] — Unreleased\n\n- Added\n\n## [0.0.9]\n",
        "0.1.0",
      ),
    ).toContain("- Added");
  });
});

describe("e2e selectors", () => {
  it("pins the locale and avoids placeholder/positional selectors", () => {
    expect(e2eConfig).toContain('locale: "en-US"');
    expect(e2eSpec).toContain('[data-action="new-project"]');
    expect(e2eSpec).toContain("data-search-input");
    expect(e2eSpec).toContain("data-replace-input");
    expect(e2eSpec).not.toContain('placeholder="Search"');
    expect(e2eSpec).not.toContain('.nth(1).getByRole("button").nth(2)');
  });
});
