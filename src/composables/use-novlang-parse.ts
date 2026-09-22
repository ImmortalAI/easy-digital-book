import { useDebounceFn } from "@vueuse/core";
import { computed, onScopeDispose, ref, shallowReactive, toValue, watch } from "vue";
import type { MaybeRefOrGetter } from "vue";
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

export function useNovlangParse(chapterId: MaybeRefOrGetter<string>) {
  const project = useProjectStore();
  const diagnostics = useDiagnosticsStore();
  const { bookGeneration } = storeToRefs(project);
  const currentChapterId = computed(() => toValue(chapterId));
  ensureBookLifecycle(project.book?.metadata.id ?? null);
  const result = ref<ParseResult | null>(chapterParseResults.get(currentChapterId.value) ?? null);

  function parseAllChapters(): void {
    const book = project.book;
    if (!book) return;
    for (const chapter of book.chapters) {
      const parsed = parse(chapter.source);
      chapterParseResults.set(chapter.id, parsed);
      diagnostics.setChapterDiagnostics(chapter.id, parsed.diagnostics);
    }
    result.value = chapterParseResults.get(currentChapterId.value) ?? null;
  }

  parseAllChapters();

  function parseCurrent(): ParseResult | undefined {
    const id = currentChapterId.value;
    const chapter = project.book?.chapters.find((item) => item.id === id);
    if (!chapter) return undefined;
    const parsed = parse(chapter.source);
    chapterParseResults.set(id, parsed);
    result.value = parsed;
    diagnostics.setChapterDiagnostics(id, parsed.diagnostics);
    return parsed;
  }

  const scheduleParse = useDebounceFn(() => parseCurrent(), 150);

  function updateSource(source: string): void {
    project.updateChapterSource(currentChapterId.value, source);
    scheduleParse();
  }

  function diagnosticEditorRange(position: { line: number; column: number }) {
    const source =
      project.book?.chapters.find((item) => item.id === currentChapterId.value)?.source ?? "";
    return diagnosticRange(source, position);
  }

  const stopChapterWatch = watch(currentChapterId, (id) => {
    scheduleParse.cancel();
    result.value = chapterParseResults.get(id) ?? null;
  });
  const stopGenerationWatch = watch(bookGeneration, () => {
    scheduleParse.cancel();
    resetChapterParseResults();
    resetChapterEditors();
    diagnostics.clearParse();
    activeBookId = project.book?.metadata.id ?? null;
    parseAllChapters();
  });
  function dispose(): void {
    scheduleParse.cancel();
    stopChapterWatch();
    stopGenerationWatch();
  }
  onScopeDispose(dispose, true);

  return {
    result,
    updateSource,
    parseCurrent,
    scheduleParse,
    diagnosticEditorRange,
    dispose,
  };
}

export { diagnosticRange };
