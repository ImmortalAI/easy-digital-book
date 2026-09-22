export function assertReleaseTag(tag: string, packageVersion: string): void {
  const expected = `v${packageVersion}`;
  if (tag !== expected) {
    throw new Error(`release tag ${tag} must match package.json version as ${expected}`);
  }
}

const tag = process.argv[2];
if (tag) {
  const packageVersion = (await import("../package.json", { with: { type: "json" } })).default
    .version as string;
  assertReleaseTag(tag, packageVersion);
}
