export type ImagePlan = {
  width: number;
  height: number;
  format: "png" | "jpeg";
  quality?: number;
  grayscale: boolean;
};

export type ImageProcessInput = { bytes: Uint8Array; plan: ImagePlan };
export type BrowserImageMediaType = "image/jpeg" | "image/png";
export type ProcessedImage = {
  bytes: Uint8Array;
  mediaType: BrowserImageMediaType;
  width: number;
  height: number;
};

export interface ImageProcessor {
  process(input: ImageProcessInput, signal?: AbortSignal): Promise<ProcessedImage>;
  dispose(): void;
}
