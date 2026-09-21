import { useEventListener } from "@vueuse/core";

export interface GlobalShortcutHandlers {
  newBook?: () => void;
  open?: () => void;
  save?: () => void;
  saveAs?: () => void;
  exportEpub?: () => void;
  toggleSidebar?: () => void;
  explorer?: () => void;
  searchBook?: () => void;
  textMode?: () => void;
  splitMode?: () => void;
  previewMode?: () => void;
  replaceAll?: () => void;
}

const editableTagNames = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    editableTagNames.has(target.tagName) ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  );
}

function isCodeMirrorShortcut(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement) || !target.closest(".cm-editor")) return false;
  return key === "b" || key === "i" || key === "f";
}

export function handleGlobalShortcut(
  event: KeyboardEvent,
  handlers: GlobalShortcutHandlers,
): boolean {
  const mod = event.metaKey || event.ctrlKey;
  if (!mod) return false;
  const key = event.key.toLowerCase();
  const shortcut =
    event.altKey && key === "enter"
      ? handlers.replaceAll
      : event.shiftKey && key === "s"
        ? handlers.saveAs
        : event.shiftKey && key === "e"
          ? handlers.explorer
          : event.shiftKey && key === "f"
            ? handlers.searchBook
            : key === "n"
              ? handlers.newBook
              : key === "o"
                ? handlers.open
                : key === "s"
                  ? handlers.save
                  : key === "e"
                    ? handlers.exportEpub
                    : key === "\\"
                      ? handlers.toggleSidebar
                      : key === "1"
                        ? handlers.textMode
                        : key === "2"
                          ? handlers.splitMode
                          : key === "3"
                            ? handlers.previewMode
                            : undefined;
  if (!shortcut) {
    if (isEditableTarget(event.target) && !isCodeMirrorShortcut(event.target, key)) return false;
    return false;
  }
  if (isEditableTarget(event.target) && !isCodeMirrorShortcut(event.target, key)) return false;
  event.preventDefault();
  shortcut();
  return true;
}

export function useShortcuts(handlers: GlobalShortcutHandlers) {
  return useEventListener(window, "keydown", (event) => handleGlobalShortcut(event, handlers));
}
