import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  chapterEditorStates,
  createChapterEditor,
  insertFootnote,
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

  it("keeps one editor state per chapter and can reset the lifecycle", () => {
    resetChapterEditors();
    const first = createChapterEditor("one", "text");
    expect(createChapterEditor("one", "different")).toBe(first);
    expect(chapterEditorStates.get("one")).toBe(first);

    resetChapterEditors();
    expect(chapterEditorStates.size).toBe(0);
  });
});
