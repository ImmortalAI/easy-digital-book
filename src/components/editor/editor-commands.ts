import { history } from "@codemirror/commands";
import {
  EditorSelection,
  EditorState,
  Compartment,
  type Extension,
  type SelectionRange,
  type StateEffect,
  type Transaction,
} from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/** Editor states are deliberately kept outside Pinia's reactive book model. */
export const chapterEditorStates = new Map<string, EditorState>();
const chapterEditorCompartments = new Map<string, Compartment>();
/** Backwards-compatible descriptive alias for consumers that own the editor lifecycle. */
export const editorStates = chapterEditorStates;
const chapterEditorViews = new Map<string, EditorView>();

export function registerChapterEditorView(chapterId: string, view: EditorView): void {
  chapterEditorViews.set(chapterId, view);
}

export function unregisterChapterEditorView(chapterId: string, view: EditorView): void {
  if (chapterEditorViews.get(chapterId) === view) chapterEditorViews.delete(chapterId);
}

export function replaceChapterEditorText(
  chapterId: string,
  changes: Array<{ from: number; to: number; insert: string }>,
): string {
  const view = chapterEditorViews.get(chapterId);
  // A mounted view is the source of truth: only doc changes are mirrored back
  // into chapterEditorStates, so the map lags behind after any other
  // transaction and building on it would dispatch a transaction that does not
  // start from the view's current state.
  const state = view?.state ?? chapterEditorStates.get(chapterId);
  if (!state) throw new Error(`Editor state not found for ${chapterId}`);
  const transaction = state.update({ changes });
  if (view) view.dispatch(transaction);
  chapterEditorStates.set(chapterId, transaction.state);
  return transaction.state.doc.toString();
}

export function resetChapterEditors(): void {
  chapterEditorStates.clear();
  chapterEditorCompartments.clear();
  chapterEditorViews.clear();
}

export function createChapterEditor(
  chapterId: string,
  source: string,
  extensions: Extension[] = [],
): EditorState {
  const existing = chapterEditorStates.get(chapterId);
  if (existing) return existing;
  const compartment = new Compartment();
  chapterEditorCompartments.set(chapterId, compartment);
  const state = EditorState.create({
    doc: source,
    extensions: [history(), compartment.of(extensions)],
  });
  chapterEditorStates.set(chapterId, state);
  return state;
}

/** Rebind view-specific listeners while retaining the chapter's undo history. */
export function reconfigureChapterEditor(
  chapterId: string,
  extensions: Extension[],
): StateEffect<unknown> | null {
  return chapterEditorCompartments.get(chapterId)?.reconfigure(extensions) ?? null;
}

function markerFor(value: "*" | "**" | "bold" | "italic"): "*" | "**" {
  return value === "bold" ? "**" : value === "italic" ? "*" : value;
}

function selectedRange(state: EditorState, range?: Pick<SelectionRange, "from" | "to">) {
  return range ?? state.selection.main;
}

/** Return a transaction that toggles NovLang emphasis around the selected text. */
export function toggleMarkup(
  state: EditorState,
  markup: "*" | "**" | "bold" | "italic",
  range?: Pick<SelectionRange, "from" | "to">,
): Transaction {
  const marker = markerFor(markup);
  const { from, to } = selectedRange(state, range);
  const selected = state.sliceDoc(from, to);
  const before = state.sliceDoc(Math.max(0, from - marker.length), from);
  const after = state.sliceDoc(to, Math.min(state.doc.length, to + marker.length));

  if (before === marker && after === marker) {
    return state.update({
      changes: [
        { from: from - marker.length, to: from, insert: "" },
        { from: to, to: to + marker.length, insert: "" },
      ],
      selection: EditorSelection.range(from - marker.length, to - marker.length),
    });
  }

  if (
    selected.startsWith(marker) &&
    selected.endsWith(marker) &&
    selected.length >= marker.length * 2
  ) {
    return state.update({
      changes: { from, to, insert: selected.slice(marker.length, -marker.length) },
      selection: EditorSelection.range(from, to - marker.length * 2),
    });
  }

  if (from === to) {
    return state.update({
      changes: { from, to, insert: marker + marker },
      selection: EditorSelection.cursor(from + marker.length),
    });
  }

  return state.update({
    changes: { from, to, insert: marker + selected + marker },
    selection: EditorSelection.range(from + marker.length, to + marker.length),
  });
}

function nextFootnoteNumber(source: string): number {
  const used = new Set<number>();
  for (const match of source.matchAll(/\[\^(\d+)\]/g)) used.add(Number(match[1]));
  let number = 1;
  while (used.has(number)) number++;
  return number;
}

/** Insert a reference at the cursor and an empty definition at the end of the chapter. */
export function insertFootnote(state: EditorState): Transaction {
  const source = state.doc.toString();
  const number = nextFootnoteNumber(source);
  const reference = `[^${number}]`;
  const { from, to } = state.selection.main;
  const suffix = source.length === 0 ? "" : source.endsWith("\n\n") ? "" : "\n";
  const definition = `${suffix}[^${number}]: `;
  const finalLength = source.length - (to - from) + reference.length + definition.length;
  return state.update({
    changes: [
      { from, to, insert: reference },
      { from: source.length, to: source.length, insert: definition },
    ],
    selection: EditorSelection.cursor(finalLength),
  });
}
