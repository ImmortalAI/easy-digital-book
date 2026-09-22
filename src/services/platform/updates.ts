import type { Updates } from "@/types/platform";
import packageJson from "../../../package.json";

export interface GithubUpdatesOptions {
  currentVersion?: string;
  fetchImpl?: typeof fetch;
}

function versionParts(value: string): number[] | null {
  const normalized = value.trim().replace(/^v/i, "");
  if (!/^\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?$/.test(normalized)) return null;
  const stable = normalized.split("-", 1)[0] ?? normalized;
  return stable.split(".").map(Number);
}

export function compareVersions(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return 0;
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}
export const noUpdates: Updates = {
  async check() {
    return false;
  },
};

const repository = "alex/easy-digital-book";

export function createGithubUpdates(options: GithubUpdatesOptions = {}): Updates {
  const currentVersion = options.currentVersion ?? packageJson.version;
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async check() {
      const response = await fetchImpl(
        `https://api.github.com/repos/${repository}/releases/latest`,
        {
          headers: { Accept: "application/vnd.github+json" },
        },
      );
      if (!response.ok) throw new Error(`Update check failed with HTTP ${response.status}`);
      const release = (await response.json()) as {
        tag_name?: unknown;
        html_url?: unknown;
        body?: unknown;
      };
      if (typeof release.tag_name !== "string" || typeof release.html_url !== "string")
        return false;
      const version = release.tag_name.replace(/^v/i, "");
      if (compareVersions(version, currentVersion) <= 0) return false;
      return {
        version,
        url: release.html_url,
        notes: typeof release.body === "string" ? release.body : undefined,
      };
    },
  };
}

export const githubUpdates = createGithubUpdates();
