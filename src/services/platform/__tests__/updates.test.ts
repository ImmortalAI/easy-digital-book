import { describe, expect, it, vi } from "vitest";
import { createGithubUpdates } from "@/services/platform/updates";

describe("github updates", () => {
  it("only reports a release newer than the installed version", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v1.2.3", html_url: "https://example.test" }), {
        status: 200,
      }),
    );
    await expect(createGithubUpdates({ currentVersion: "1.2.3", fetchImpl }).check()).resolves.toBe(
      false,
    );

    fetchImpl.mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v1.3.0", html_url: "https://example.test" }), {
        status: 200,
      }),
    );
    await expect(
      createGithubUpdates({ currentVersion: "1.2.3", fetchImpl }).check(),
    ).resolves.toEqual({ version: "1.3.0", url: "https://example.test" });
  });
});
