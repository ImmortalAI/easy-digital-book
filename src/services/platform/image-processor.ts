import type { ImageProcessInput, ImageProcessor, ProcessedImage } from "@/types/platform";

type WorkerResponse =
  | { id: number; ok: true; result: ProcessedImage }
  | { id: number; ok: false; error: string };
type Pending = {
  resolve: (result: ProcessedImage) => void;
  reject: (error: Error) => void;
  removeAbortListener: () => void;
};

export class BrowserImageProcessor implements ImageProcessor {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(
    workerFactory: () => Worker = () =>
      new Worker(new URL("../../workers/image.worker.ts", import.meta.url), { type: "module" }),
  ) {
    this.worker = workerFactory();
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const request = this.pending.get(event.data.id);
      if (!request) return;
      this.pending.delete(event.data.id);
      request.removeAbortListener();
      if (event.data.ok) request.resolve(event.data.result);
      else request.reject(new Error(event.data.error));
    };
    this.worker.onerror = (event: ErrorEvent) => {
      const message = event.message || "Image worker failed";
      for (const [id, request] of this.pending) {
        this.pending.delete(id);
        request.removeAbortListener();
        request.reject(new Error(message));
      }
    };
  }

  process(input: ImageProcessInput, signal?: AbortSignal): Promise<ProcessedImage> {
    if (signal?.aborted)
      return Promise.reject(new DOMException("The operation was aborted", "AbortError"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.pending.delete(id);
        this.worker.postMessage({ type: "cancel", id });
        reject(new DOMException("The operation was aborted", "AbortError"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      this.pending.set(id, {
        resolve,
        reject,
        removeAbortListener: () => signal?.removeEventListener("abort", abort),
      });
      const bytes = input.bytes.slice();
      this.worker.postMessage({ id, bytes: bytes.buffer, plan: input.plan }, [bytes.buffer]);
    });
  }

  dispose(): void {
    for (const pending of this.pending.values()) pending.removeAbortListener();
    for (const pending of this.pending.values())
      pending.reject(new Error("Image processor disposed"));
    this.pending.clear();
    this.worker.terminate();
  }
}
