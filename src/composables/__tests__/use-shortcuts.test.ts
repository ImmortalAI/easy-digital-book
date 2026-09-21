import { describe, expect, it, vi } from "vitest";
import { handleGlobalShortcut } from "@/composables/use-shortcuts";

function eventFor(target: HTMLElement, key: string, extra: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, ctrlKey: true, ...extra });
  Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("global shortcut filtering", () => {
  it("allows global save from CodeMirror but leaves markup keys to CodeMirror", () => {
    const editor = document.createElement("div");
    editor.className = "cm-editor";
    document.body.append(editor);
    const save = vi.fn<() => void>();

    expect(handleGlobalShortcut(eventFor(editor, "s"), { save })).toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(handleGlobalShortcut(eventFor(editor, "b"), { save })).toBe(false);
  });

  it("ignores global commands from ordinary editable controls", () => {
    const input = document.createElement("input");
    const save = vi.fn<() => void>();

    expect(handleGlobalShortcut(eventFor(input, "s"), { save })).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});
