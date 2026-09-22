import {
  createChapterEditor,
  replaceChapterEditorText,
  chapterEditorStates,
} from "@/components/editor/editor-commands";
import { removeChapter } from "@/services/book/chapters";
import { replaceMatches, type ReplacementChange } from "@/services/search/replace";
import type { SearchQuery, SearchResult } from "@/services/search/query";
import { useNotificationsStore } from "@/stores/notifications";
import { useProjectStore } from "@/stores/project";
export type ReplaceAllUndo = { originals: Map<string, string>; revisionAfter: Map<string, number> };

function replacementChanges(
  change: ReplacementChange,
): Array<{ from: number; to: number; insert: string }> {
  return change.matches
    .map((match) => ({ from: match.from, to: match.to, insert: match.replacementPreview ?? "" }))
    .sort((a, b) => b.from - a.from);
}

export function useBookSearch() {
  const project = useProjectStore();
  const notifications = useNotificationsStore();

  function applyChange(change: ReplacementChange): void {
    const chapter = project.book?.chapters.find((item) => item.id === change.chapterId);
    if (!chapter) return;
    if (!chapterEditorStates.has(chapter.id)) createChapterEditor(chapter.id, chapter.source);
    const source = replaceChapterEditorText(chapter.id, replacementChanges(change));
    project.updateChapterSource(chapter.id, source);
  }

  function replaceOne(result: SearchResult, replacement: string): void {
    if (!project.book) return;
    const source = project.book.chapters.find((chapter) => chapter.id === result.chapterId)?.source;
    if (source === undefined) return;
    const planned = replaceMatches(
      { ...project.book, chapters: [{ id: result.chapterId, source }] },
      { text: result.matched, caseSensitive: true, wholeWord: false, regex: false },
      replacement,
    );
    const plannedMatch = "error" in planned ? undefined : planned.changes[0]?.matches[0];
    const change: ReplacementChange = {
      chapterId: result.chapterId,
      source: source.slice(0, result.from) + replacement + source.slice(result.to),
      matches: [{ ...result, replacementPreview: plannedMatch?.replacementPreview ?? replacement }],
    };
    applyChange(change);
  }

  function replaceChapter(chapterId: string, query: SearchQuery, replacement: string): number {
    if (!project.book) return 0;
    const book = {
      ...project.book,
      chapters: project.book.chapters.filter((item) => item.id === chapterId),
    };
    const result = replaceMatches(book, query, replacement);
    if ("error" in result) return 0;
    result.changes.forEach(applyChange);
    return result.changes.reduce((total, change) => total + change.matches.length, 0);
  }

  function replaceAll(query: SearchQuery, replacement: string): ReplaceAllUndo | null {
    if (!project.book) return null;
    const result = replaceMatches(project.book, query, replacement);
    if ("error" in result || result.changes.length === 0) return null;
    const originals = new Map(
      result.changes.map((change) => [
        change.chapterId,
        project.book!.chapters.find((chapter) => chapter.id === change.chapterId)!.source,
      ]),
    );
    result.changes.forEach(applyChange);
    const revisionAfter = new Map(
      result.changes.map((change) => [change.chapterId, project.chapterRevision(change.chapterId)]),
    );
    const undo: ReplaceAllUndo = { originals, revisionAfter };
    const notificationId = notifications.add({
      message: `Replaced ${result.changes.reduce((total, change) => total + change.matches.length, 0)} matches`,
      kind: "success",
      undo: () => undoReplace(undo),
      undoState: () =>
        [...undo.revisionAfter].some(([id, revision]) => project.chapterRevision(id) === revision),
    });
    void notificationId;
    return undo;
  }

  function undoReplace(undo: ReplaceAllUndo): void {
    for (const [chapterId, source] of undo.originals) {
      if (project.chapterRevision(chapterId) !== undo.revisionAfter.get(chapterId)) continue;
      if (project.book?.chapters.some((chapter) => chapter.id === chapterId)) {
        const current = project.book.chapters.find((chapter) => chapter.id === chapterId)!.source;
        if (!chapterEditorStates.has(chapterId)) createChapterEditor(chapterId, current);
        const state = chapterEditorStates.get(chapterId)!;
        if (state.doc.toString() !== source) {
          replaceChapterEditorText(chapterId, [{ from: 0, to: state.doc.length, insert: source }]);
        }
        project.updateChapterSource(chapterId, source);
      }
    }
  }

  function deleteChapter(chapterId: string): void {
    if (!project.book) return;
    const index = project.book.chapters.findIndex((chapter) => chapter.id === chapterId);
    const chapter = project.book.chapters[index];
    if (!chapter || project.book.chapters.length <= 1) return;
    project.applyMutation(removeChapter(project.book, chapterId));
    notifications.add({
      message: "Chapter deleted",
      undo: () => {
        if (!project.book || project.book.chapters.some((item) => item.id === chapterId)) return;
        const next = [...project.book.chapters];
        next.splice(Math.min(index, next.length), 0, chapter);
        project.applyMutation({
          book: { ...project.book, chapters: next },
          changedChapters: new Set([chapterId]),
          removedChapters: new Set(),
          changedResources: new Set(),
          removedResources: new Set(),
        });
      },
    });
  }

  return { replaceOne, replaceChapter, replaceAll, undoReplace, deleteChapter };
}
