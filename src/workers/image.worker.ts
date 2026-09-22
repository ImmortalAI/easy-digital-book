import type { ImagePlan, ProcessedImage } from "@/types/platform";
import { createByteLru } from "@/utils/byte-lru";

type Request =
  | { type?: "process"; id: number; bytes: ArrayBuffer; plan: ImagePlan }
  | { type: "cancel"; id: number };
type Response =
  | { id: number; ok: true; result: ProcessedImage }
  | { id: number; ok: false; error: string };

// Bounded for the same reason as the one in epub/build.ts, which caches the
// same outputs on the main thread.
const cache = createByteLru<ProcessedImage>(64 * 1024 * 1024);
const jobs = new Map<number, AbortController>();

async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function processImage(
  bytes: Uint8Array,
  plan: ImagePlan,
  signal?: AbortSignal,
): Promise<ProcessedImage> {
  if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
  if (plan.passthrough) {
    return {
      bytes: bytes.slice(),
      mediaType: "image/jpeg",
      width: plan.width,
      height: plan.height,
    };
  }
  const key = `${await digest(bytes)}:${JSON.stringify(plan)}`;
  const cached = cache.get(key);
  if (cached) return { ...cached, bytes: cached.bytes.slice() };
  if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");

  const bitmap = await createImageBitmap(new Blob([bytes.slice().buffer]));
  try {
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
    const scale = Math.min(1, plan.width / bitmap.width, plan.height / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas is unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
    if (plan.grayscale) {
      const pixels = context.getImageData(0, 0, width, height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const gray = Math.round(
          0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2],
        );
        pixels.data[i] = gray;
        pixels.data[i + 1] = gray;
        pixels.data[i + 2] = gray;
      }
      context.putImageData(pixels, 0, 0);
    }
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
    const mediaType: ProcessedImage["mediaType"] =
      plan.format === "jpeg" ? "image/jpeg" : "image/png";
    const blob = await canvas.convertToBlob({
      type: mediaType,
      quality: plan.format === "jpeg" ? (plan.quality ?? 0.9) : undefined,
    });
    const result = { bytes: new Uint8Array(await blob.arrayBuffer()), mediaType, width, height };
    cache.set(key, result);
    return { ...result, bytes: result.bytes.slice() };
  } finally {
    bitmap.close();
  }
}

export async function handleWorkerMessage(
  data: Request,
  postMessage: (message: Response, transfer?: Transferable[]) => void,
): Promise<void> {
  if (data.type === "cancel") {
    jobs.get(data.id)?.abort();
    return;
  }
  const controller = new AbortController();
  jobs.set(data.id, controller);
  try {
    const result = await processImage(new Uint8Array(data.bytes), data.plan, controller.signal);
    postMessage({ id: data.id, ok: true, result }, [result.bytes.buffer]);
  } catch (error) {
    postMessage({
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    jobs.delete(data.id);
  }
}

const scope = globalThis as typeof globalThis & {
  postMessage?: (message: Response, transfer?: Transferable[]) => void;
  onmessage?: (event: MessageEvent<Request>) => void;
};
if (typeof document === "undefined") {
  scope.onmessage = ({ data }) => {
    void handleWorkerMessage(data, (message, transfer) => scope.postMessage?.(message, transfer));
  };
}
