import type { Book, BookMutation, ImageMediaType } from "@/types/book";
import { uniqueResourcePath } from "@/utils/paths";

export interface ImageHash {
  sha256(bytes: Uint8Array): string | Promise<string>;
}
export interface ImportImageResult extends BookMutation {
  path: string;
  inserted: boolean;
}
function detect(bytes: Uint8Array): ImageMediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}
export async function importImage(
  book: Book,
  fileName: string,
  bytes: Uint8Array,
  deps: ImageHash,
): Promise<ImportImageResult> {
  const mediaType = detect(bytes);
  if (!mediaType) throw new Error("Unsupported image format");
  const hash = await deps.sha256(bytes);
  for (const [path, resource] of book.resources)
    if ((await deps.sha256(resource.bytes)) === hash)
      return {
        book,
        path,
        inserted: false,
        changedChapters: new Set(),
        removedChapters: new Set(),
        changedResources: new Set(),
        removedResources: new Set(),
      };
  const extension = mediaType === "image/jpeg" ? "jpg" : mediaType.slice("image/".length);
  const path = uniqueResourcePath(book.resources.keys(), fileName, extension);
  const resources = new Map(book.resources);
  resources.set(path, { bytes: bytes.slice(), mediaType });
  return {
    book: { ...book, resources },
    path,
    inserted: true,
    changedChapters: new Set(),
    removedChapters: new Set(),
    changedResources: new Set([path]),
    removedResources: new Set(),
  };
}
export function removeResource(book: Book, path: string): BookMutation {
  const resources = new Map(book.resources);
  const existed = resources.delete(path);
  return {
    book: { ...book, resources },
    changedChapters: new Set(),
    removedChapters: new Set(),
    changedResources: new Set(),
    removedResources: existed ? new Set([path]) : new Set(),
  };
}
