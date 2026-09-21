import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBook } from "@/services/book/create";
import { chapterParseResults, resetChapterParseResults } from "@/composables/use-novlang-parse";
import { useProjectStore } from "@/stores/project";
import PreviewPane from "@/components/editor/PreviewPane.vue";

describe("PreviewPane security and rendering", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetChapterParseResults();
    useProjectStore().setBook(
      createBook({
        locale: "en",
        now: new Date("2026-01-01"),
        newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
        newChapterId: () => "chapter1",
      }),
    );
  });

  it("creates one sandboxed iframe with a restrictive CSP", async () => {
    chapterParseResults.set("chapter1", {
      document: {
        type: "document",
        children: [{ type: "paragraph", children: [{ type: "text", value: "Hello" }] }],
      },
      diagnostics: [],
    });
    const wrapper = mount(PreviewPane, { props: { chapterId: "chapter1" } });
    await wrapper.vm.$nextTick();
    const iframe = wrapper.get("iframe");

    expect(wrapper.findAll("iframe")).toHaveLength(1);
    expect(iframe.attributes("sandbox")).toBe("allow-same-origin");
    expect(iframe.attributes("srcdoc")).toContain("default-src 'none'");
    expect(iframe.attributes("srcdoc")).toContain("img-src blob:");
    expect(iframe.attributes("srcdoc")).toContain("style-src 'unsafe-inline'");
    wrapper.unmount();
  });

  it("uses the shared parse result and rewrites image URLs", async () => {
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cover");
    const book = useProjectStore().book!;
    book.customCss = '.cover { background: url("images/cover.png"); }';
    book.resources.set("images/cover.png", {
      mediaType: "image/png",
      bytes: new Uint8Array([1, 2, 3]),
    });
    chapterParseResults.set("chapter1", {
      document: {
        type: "document",
        children: [
          {
            type: "paragraph",
            children: [{ type: "image", alt: "cover", src: "images/cover.png" }],
          },
        ],
      },
      diagnostics: [],
    });

    const wrapper = mount(PreviewPane, { props: { chapterId: "chapter1" } });
    await wrapper.vm.$nextTick();

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(wrapper.get("iframe").attributes("srcdoc")).toContain("body { max-width: 36em");
    expect(wrapper.get("iframe").attributes("srcdoc")).not.toContain(
      "https://fonts.googleapis.com",
    );
    createUrl.mockRestore();
    wrapper.unmount();
  });
});
