import type { ImageMediaType } from "@/types/book";

export interface ImageDimensions {
  width: number;
  height: number;
}

export function imageDimensions(
  bytes: Uint8Array,
  mediaType: ImageMediaType,
): ImageDimensions | null {
  if (mediaType === "image/png" && bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mediaType === "image/gif" && bytes.length >= 10) {
    return { width: bytes[6]! | (bytes[7]! << 8), height: bytes[8]! | (bytes[9]! << 8) };
  }
  if (
    mediaType === "image/webp" &&
    bytes.length >= 30 &&
    bytes[12] === 0x56 &&
    bytes[13] === 0x50
  ) {
    if (bytes[15] === 0x58) {
      const read24 = (offset: number) =>
        bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
      return { width: 1 + read24(24), height: 1 + read24(27) };
    }
  }
  return null;
}
