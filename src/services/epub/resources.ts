import type { ImageMediaType } from "@/types/book";
import type { ImagePlan } from "@/types/platform";

export interface ImageMeta {
  mediaType: ImageMediaType;
  width: number;
  height: number;
  hasAlpha?: boolean;
}
export interface ImagePlanOptions {
  imagePreset: "kindle-paperwhite" | "original";
  grayscale: boolean;
}

export function planImage(meta: ImageMeta, options: ImagePlanOptions, isCover: boolean): ImagePlan {
  const maxWidth = isCover ? 1600 : 1264;
  const maxHeight = isCover ? 2560 : 1680;
  const scale =
    options.imagePreset === "kindle-paperwhite"
      ? Math.min(1, maxWidth / meta.width, maxHeight / meta.height)
      : 1;
  const width = Math.max(1, Math.round(meta.width * scale));
  const height = Math.max(1, Math.round(meta.height * scale));
  const format: ImagePlan["format"] =
    meta.mediaType === "image/png" || meta.mediaType === "image/gif"
      ? "png"
      : meta.mediaType === "image/webp" && meta.hasAlpha
        ? "png"
        : "jpeg";
  return {
    width,
    height,
    format,
    ...(format === "jpeg" &&
    (options.imagePreset === "kindle-paperwhite" || meta.mediaType === "image/webp")
      ? { quality: 0.85 }
      : {}),
    ...(options.imagePreset === "original" && meta.mediaType === "image/jpeg"
      ? { passthrough: true }
      : {}),
    grayscale: options.grayscale,
  };
}
