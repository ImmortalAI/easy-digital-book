import type { Updates } from "@/types/platform";
export const noUpdates: Updates = {
  async check() {
    return false;
  },
};

const repository = "alex/easy-digital-book";

export const githubUpdates: Updates = {
  async check() {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`Update check failed with HTTP ${response.status}`);
    const release = (await response.json()) as {
      tag_name?: unknown;
      html_url?: unknown;
      body?: unknown;
    };
    if (typeof release.tag_name !== "string" || typeof release.html_url !== "string") return false;
    return {
      version: release.tag_name.replace(/^v/, ""),
      url: release.html_url,
      notes: typeof release.body === "string" ? release.body : undefined,
    };
  },
};
