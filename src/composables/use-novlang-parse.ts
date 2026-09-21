import { useDebounceFn } from "@vueuse/core";
import { shallowReactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { parse, type ParseResult } from "novlang-js";
import { useDiagnosticsStore } from "@/stores/diagnostics";
import { useProjectStore } from "@/stores/project";
import { diagnosticRange } from "@/components/editor/novlang-language";
import { resetChapterEditors } from "@/components/editor/editor-commands";

/** The single parse cache shared by the editor and the preview. */
export const chapterParseResults = shallowReactive(new Map<string, ParseResult>());
let activeBookId: string | null = null;

export function resetChapterParseResults(): void {
  chapterParseResults.clear();
  activeBookId = null;
}

function ensureBookLifecycle(bookId: string | null): void {
  if (bookId === activeBookId) return;
  chapterParseResults.clear();
  resetChapterEditors();
  activeBookId = bookId;
}

export function useNovlangParse(chapterId: string) {
  const project = useProjectStore();
  const diagnostics = useDiagnosticsStore();
  const { revision, bookGeneration } = storeToRefs(project);
  ensureBookLifecycle(project.book?.metadata.id ?? null);
  const result = ref<ParseResult | null>(chapterParseResults.get(chapterId) ?? null);
  watch(bookGeneration, () => {
    if (revision.value !== 0) return;
    chapterParseResults.clear();
    resetChapterEditors();
    activeBookId = project.book?.metadata.id ?? null;
    result.value = chapterParseResults.get(chapterId) ?? null;
  });

  function parseCurrent(): ParseResult | undefined {
    const chapter = project.book?.chapters.find((item) => item.id === chapterId);
    if (!chapter) return undefined;
    const parsed = parse(chapter.source);
    chapterParseResults.set(chapterId, parsed);
    result.value = parsed;
    diagnostics.setChapterDiagnostics(chapterId, parsed.diagnostics);
    return parsed;
  }

  const scheduleParse = useDebounceFn(() => parseCurrent(), 150);

  function updateSource(source: string): void {
    project.updateChapterSource(chapterId, source);
    scheduleParse();
  }

  function diagnosticEditorRange(position: { line: number; column: number }) {
    const source = project.book?.chapters.find((item) => item.id === chapterId)?.source ?? "";
    return diagnosticRange(source, position);
  }

  return {
    result,
    updateSource,
    parseCurrent,
    scheduleParse,
    diagnosticEditorRange,
  };
}

export { diagnosticRange };
