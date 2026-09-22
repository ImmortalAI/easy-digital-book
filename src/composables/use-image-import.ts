import { importImage, type ImageHash, type ImportImageResult } from "@/services/book/resources";
import { useProjectStore } from "@/stores/project";
import { useLayoutStore } from "@/stores/layout";

export function validateLanguage(value: string): { valid: boolean; canonical?: string } {
  try {
    const canonical = Intl.getCanonicalLocales(value.trim())[0];
    return canonical ? { valid: true, canonical } : { valid: false };
  } catch {
    return { valid: false };
  }
}

export function insertImageParagraph(source: string, position: number, path: string): string {
  const before = source.slice(0, position);
  const after = source.slice(position);
  const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
  const suffix = after && !after.startsWith("\n") ? "\n\n" : "\n";
  return `${before}${prefix}![](${path})${suffix}${after}`;
}

export function imageCursorPosition(source: string, position: number): number {
  const before = source.slice(0, position);
  const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
  return position + prefix.length + 2;
}

async function browserSha256(bytes: Uint8Array): Promise<string> {
  const digest = await window.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface ImageImportOptions {
  chapterId?: string;
  position?: number;
  fileName?: string;
  onInserted?: (result: ImportImageResult, cursor: number) => void;
  pickFile?: () => Promise<ImageFile | null>;
}
export interface ImageFile {
  name: string;
  bytes: Uint8Array;
  type?: string;
}

export function useImageImport(options: ImageImportOptions = {}) {
  const project = useProjectStore();
  const layout = useLayoutStore();
  const deps: ImageHash = { sha256: browserSha256 };

  async function add(
    fileName: string,
    bytes: Uint8Array,
    chapterId = options.chapterId,
    position?: number,
  ) {
    if (!project.book) throw new Error("No project is open");
    const result = await importImage(project.book, fileName, bytes, deps);
    if (result.inserted) project.applyMutation(result);
    const chapter = chapterId
      ? project.book.chapters.find((item) => item.id === chapterId)
      : undefined;
    if (chapter && position !== undefined) {
      const source = insertImageParagraph(chapter.source, position, result.path);
      project.updateChapterSource(chapter.id, source);
      options.onInserted?.(result, imageCursorPosition(chapter.source, position));
    }
    layout.center = chapter
      ? { kind: "chapter", id: chapter.id }
      : { kind: "image", path: result.path };
    return result;
  }

  async function importFile(file: ImageFile, chapterId?: string, position?: number) {
    return add(file.name, file.bytes, chapterId, position);
  }

  async function pickAndImport(chapterId?: string, position?: number) {
    const file = await options.pickFile?.();
    return file ? importFile(file, chapterId, position) : null;
  }

  async function importClipboardImage(
    data: DataTransfer | null,
    chapterId = options.chapterId,
    position = options.position,
  ) {
    const file = [...(data?.files ?? [])].find((item) => item.type.startsWith("image/"));
    if (!file) return null;
    return add(
      options.fileName ?? `pasted-${timestamp()}.png`,
      new Uint8Array(await file.arrayBuffer()),
      chapterId,
      position,
    );
  }

  return { add, importFile, pickAndImport, importClipboardImage };
}

function timestamp() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
