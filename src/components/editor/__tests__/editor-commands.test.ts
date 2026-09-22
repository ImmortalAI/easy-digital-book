import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  chapterEditorStates,
  createChapterEditor,
  insertFootnote,
  registerChapterEditorView,
  replaceChapterEditorText,
  resetChapterEditors,
  toggleMarkup,
} from "@/components/editor/editor-commands";

describe("editor commands", () => {
  it("wraps a selected range in bold markup", () => {
    const state = EditorState.create({ doc: "read this" });
    const transaction = toggleMarkup(state, "**", { from: 5, to: 9 });

    expect(transaction.state.doc.toString()).toBe("read **this**");
    expect(
      transaction.state.sliceDoc(
        transaction.state.selection.main.from,
        transaction.state.selection.main.to,
      ),
    ).toBe("this");
  });

  it("removes an existing italic wrapper instead of nesting it", () => {
    const state = EditorState.create({ doc: "read *this*" });
    const transaction = toggleMarkup(state, "*", { from: 6, to: 10 });

    expect(transaction.state.doc.toString()).toBe("read this");
    expect(transaction.state.selection.main).toMatchObject({ from: 5, to: 9 });
  });

  it("inserts the next free footnote and places the cursor in its definition", () => {
    const state = EditorState.create({
      doc: "A [^1].\n\n[^1]: Existing",
      selection: { anchor: 1 },
    });
    const transaction = insertFootnote(state);

    expect(transaction.state.doc.toString()).toContain("[^2]");
    expect(transaction.state.doc.toString()).toContain("[^2]: ");
    expect(transaction.state.selection.main.from).toBe(transaction.state.doc.length);
  });

  it("replaces against the live view state rather than a stale snapshot", () => {
    resetChapterEditors();
    const state = createChapterEditor("one", "hero walks");
    const view = new EditorView({ state });
    registerChapterEditorView("one", view);
    // Only doc changes are written back to chapterEditorStates, so any other
    // transaction desynchronises the map from the view. mountEditor always
    // dispatches two of them: the reconfigure effect and the diagnostics.
    view.dispatch({ selection: { anchor: 0 } });

    const result = replaceChapterEditorText("one", [{ from: 0, to: 4, insert: "champion" }]);

    expect(result).toBe("champion walks");
    expect(view.state.doc.toString()).toBe("champion walks");
    expect(chapterEditorStates.get("one")?.doc.toString()).toBe("champion walks");
    view.destroy();
  });

  it("replaces through the map when no view is mounted", () => {
    resetChapterEditors();
    createChapterEditor("one", "hero walks");

    expect(replaceChapterEditorText("one", [{ from: 0, to: 4, insert: "champion" }])).toBe(
      "champion walks",
    );
    expect(chapterEditorStates.get("one")?.doc.toString()).toBe("champion walks");
  });

  it("keeps one editor state per chapter and can reset the lifecycle", () => {
    resetChapterEditors();
    const first = createChapterEditor("one", "text");
    expect(createChapterEditor("one", "different")).toBe(first);
    expect(chapterEditorStates.get("one")).toBe(first);

    resetChapterEditors();
    expect(chapterEditorStates.size).toBe(0);
  });
});
