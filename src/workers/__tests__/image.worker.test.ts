import { describe, expect, it, vi } from "vitest";
import { BrowserImageProcessor } from "@/services/platform/image-processor";
import { handleWorkerMessage, processImage } from "@/workers/image.worker";

// 1x1 RGBA PNG with a transparent pixel.
const transparentPng = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScI7WQAAAABJRU5ErkJggg==",
  ),
  (character) => character.charCodeAt(0),
);

describe("browser image worker contract", () => {
  it("returns a PNG with constrained dimensions and preserves alpha", async () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 128]);
    const context = {
      drawImage: () => {},
      getImageData: () => ({ data: pixels }),
      putImageData: (imageData: { data: Uint8ClampedArray }) => {
        pixels.set(imageData.data);
      },
    };
    class FakeCanvas {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {}
      getContext() {
        return context;
      }
      convertToBlob() {
        return Promise.resolve(new Blob(["encoded-png"], { type: "image/png" }));
      }
    }
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalOffscreenCanvas = globalThis.OffscreenCanvas;
    globalThis.createImageBitmap = async () =>
      ({ width: 20, height: 10, close: () => {} }) as ImageBitmap;
    globalThis.OffscreenCanvas = FakeCanvas as unknown as typeof OffscreenCanvas;

    const result = await processImage(transparentPng, {
      width: 10,
      height: 10,
      format: "png",
      grayscale: false,
    });

    expect(result.mediaType).toBe("image/png");
    expect(result.width).toBe(10);
    expect(result.height).toBe(5);
    expect(new TextDecoder().decode(result.bytes)).toBe("encoded-png");

    await processImage(transparentPng, {
      width: 10,
      height: 10,
      format: "png",
      grayscale: true,
    });
    expect(Array.from(pixels)).toEqual([76, 76, 76, 128]);

    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  });

  it("passes the image plan JPEG quality to canvas encoding", async () => {
    let encodingOptions: unknown;
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalOffscreenCanvas = globalThis.OffscreenCanvas;
    globalThis.createImageBitmap = async () =>
      ({ width: 10, height: 10, close: () => {} }) as ImageBitmap;
    globalThis.OffscreenCanvas = class {
      width = 10;
      height = 10;
      getContext() {
        return { drawImage: () => {} };
      }
      convertToBlob(options: unknown) {
        encodingOptions = options;
        return Promise.resolve(new Blob(["encoded-jpeg"], { type: "image/jpeg" }));
      }
    } as unknown as typeof OffscreenCanvas;
    await processImage(transparentPng, {
      width: 10,
      height: 10,
      format: "jpeg",
      quality: 0.85,
      grayscale: false,
    });
    expect(encodingOptions).toEqual({ type: "image/jpeg", quality: 0.85 });
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  });

  it("sends cancellation to the worker when a request is aborted", async () => {
    let cancelMessage: { type?: "cancel"; id: number } | undefined;
    const processor = new BrowserImageProcessor(() => {
      const worker = {
        onmessage: undefined as ((event: MessageEvent) => void) | undefined,
        onerror: undefined as ((event: ErrorEvent) => void) | undefined,
        postMessage(message: { type?: "cancel"; id: number }) {
          if (message.type === "cancel") cancelMessage = message;
        },
        terminate() {},
      } as unknown as Worker;
      return worker;
    });
    const controller = new AbortController();
    const pending = processor.process(
      {
        bytes: transparentPng,
        plan: { width: 10, height: 10, format: "png", grayscale: false },
      },
      controller.signal,
    );

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelMessage).toMatchObject({ type: "cancel", id: 1 });
    processor.dispose();
  });

  it("passes worker cancellation into processing before drawing", async () => {
    let resolveBitmap!: (bitmap: ImageBitmap) => void;
    let createCalled = false;
    let drawCalled = false;
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalOffscreenCanvas = globalThis.OffscreenCanvas;
    globalThis.createImageBitmap = () => {
      createCalled = true;
      return new Promise((resolve) => {
        resolveBitmap = resolve;
      });
    };
    globalThis.OffscreenCanvas = class {
      getContext() {
        return {
          drawImage: () => {
            drawCalled = true;
          },
        };
      }
    } as unknown as typeof OffscreenCanvas;

    const responses: Array<{ ok: boolean; error?: string }> = [];
    const processing = handleWorkerMessage(
      {
        id: 42,
        bytes: Uint8Array.from([1, 2, 3]).buffer,
        plan: { width: 10, height: 10, format: "png", grayscale: false },
      },
      (message) => responses.push(message as { ok: boolean; error?: string }),
    );
    await vi.waitFor(() => expect(createCalled).toBe(true));
    await handleWorkerMessage({ type: "cancel", id: 42 }, () => {});
    resolveBitmap({ width: 20, height: 10, close: () => {} } as ImageBitmap);
    await processing;

    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ ok: false, error: "The operation was aborted" });
    expect(drawCalled).toBe(false);
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  });

  it("rejects when the worker reports an execution error", async () => {
    let triggerError: () => void;
    const processor = new BrowserImageProcessor(() => {
      const fakeWorker = {
        onmessage: undefined as ((event: MessageEvent) => void) | undefined,
        onerror: undefined as ((event: ErrorEvent) => void) | undefined,
        postMessage() {
          queueMicrotask(() => triggerError());
        },
        terminate() {},
      } as unknown as Worker;
      triggerError = () =>
        fakeWorker.onerror?.(new ErrorEvent("error", { message: "decode failed" }));
      return fakeWorker;
    });

    const result = processor.process({
      bytes: transparentPng,
      plan: { width: 10, height: 10, format: "png", grayscale: false },
    });
    await expect(result).rejects.toThrow("decode failed");
    processor.dispose();
  });
});
