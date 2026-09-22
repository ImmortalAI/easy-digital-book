import { readFile } from "node:fs/promises";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractChangelogSection(changelog: string, version: string): string {
  const heading = new RegExp(`^## \\[?${escapeRegExp(version)}\\]?\\b[^\\n]*$`, "m");
  const match = heading.exec(changelog);
  if (!match || match.index === undefined) {
    throw new Error(`CHANGELOG.md has no section for version ${version}`);
  }
  const rest = changelog.slice(match.index + match[0].length);
  const nextSection = rest.search(/^## /m);
  return (match[0] + rest.slice(0, nextSection < 0 ? undefined : nextSection)).trim();
}

const tag = process.argv[2];
if (tag) {
  const version = tag.replace(/^v/, "");
  const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  const section = extractChangelogSection(changelog, version);
  const repository = process.env.GITHUB_REPOSITORY ?? "alex/easy-digital-book";
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const body = `${section}\n\n[Full CHANGELOG.md](<${server}/${repository}/blob/${tag}/CHANGELOG.md>)`;
  const delimiter = `edb_release_notes_${Date.now()}`;
  process.stdout.write(`body<<${delimiter}\n${body}\n${delimiter}\n`);
}
