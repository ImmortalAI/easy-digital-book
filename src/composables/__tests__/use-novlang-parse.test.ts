import { createPinia, setActivePinia } from "pinia";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createBook } from "@/services/book/create";
import { useDiagnosticsStore } from "@/stores/diagnostics";
import { useProjectStore } from "@/stores/project";
import {
  chapterParseResults,
  diagnosticRange,
  resetChapterParseResults,
  useNovlangParse,
} from "@/composables/use-novlang-parse";

const makeBook = () =>
  createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });

describe("useNovlangParse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    resetChapterParseResults();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the project immediately but parses once after 150ms of quiet", () => {
    const project = useProjectStore();
    project.setBook(makeBook());
    const parser = useNovlangParse("chapter1");

    parser.updateSource("# Updated\nText");
    expect(project.book?.chapters[0]?.source).toBe("# Updated\nText");
    expect(chapterParseResults.has("chapter1")).toBe(false);

    vi.advanceTimersByTime(149);
    expect(chapterParseResults.has("chapter1")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(chapterParseResults.get("chapter1")?.document.type).toBe("document");
  });

  it("converts parser columns to editor offsets after a block prefix", () => {
    expect(diagnosticRange("# Heading\n> invalid token", { line: 2, column: 1 })).toEqual({
      from: 12,
      to: 19,
    });
  });

  it("clears parse results and editor history when a project is replaced", async () => {
    const project = useProjectStore();
    project.setBook(makeBook());
    const parser = useNovlangParse("chapter1");
    parser.parseCurrent();
    expect(chapterParseResults.has("chapter1")).toBe(true);

    project.setBook({ ...makeBook(), chapters: [{ id: "chapter1", source: "new" }] });
    await nextTick();

    expect(chapterParseResults.has("chapter1")).toBe(false);
  });

  it("clears the old parse and diagnostics when the new project is edited before flush", async () => {
    const project = useProjectStore();
    const diagnostics = useDiagnosticsStore();
    project.setBook(makeBook());
    const parser = useNovlangParse("chapter1");
    parser.parseCurrent();
    expect(chapterParseResults.has("chapter1")).toBe(true);
    expect(diagnostics.parse.has("chapter1")).toBe(true);

    project.setBook({ ...makeBook(), chapters: [{ id: "chapter1", source: "project B" }] });
    parser.updateSource("project B edited");

    await nextTick();

    expect(chapterParseResults.has("chapter1")).toBe(false);
    expect(diagnostics.parse.has("chapter1")).toBe(false);
  });
});
