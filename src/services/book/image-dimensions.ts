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
  if (mediaType === "image/jpeg" && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1]!;
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > bytes.length) break;
      const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
      if (marker >= 0xc0 && marker <= 0xc3 && offset + 7 < bytes.length)
        return {
          height: (bytes[offset + 3]! << 8) | bytes[offset + 4]!,
          width: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
        };
      offset += length;
    }
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
    if (bytes[15] === 0x20 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a)
      return { width: bytes[26]! | (bytes[27]! << 8), height: bytes[28]! | (bytes[29]! << 8) };
    if (bytes[15] === 0x4c && bytes[20] === 0x2f) {
      const width = 1 + (bytes[21]! | (bytes[22]! << 8) | ((bytes[23]! & 0x3f) << 16));
      const height = 1 + ((bytes[23]! >> 6) | (bytes[24]! << 2) | ((bytes[25]! & 0xf) << 10));
      return { width, height };
    }
  }
  return null;
}
