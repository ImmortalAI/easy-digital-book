# Image processing adapter decision (2026-09-20)

## Decision

The production adapter is the browser worker adapter in
`src/services/platform/image-processor.ts`. It uses the worker protocol in
`src/workers/image.worker.ts`, `createImageBitmap`, `OffscreenCanvas`, and
`convertToBlob`. The shared `ImageProcessor` request/response types are in
`src/types/platform.ts`; any future Rust fallback must implement these exact
types and preserve cancellation and media-type semantics.

This is a provisional implementation decision, not release sign-off. The
three-engine checks below are release-blocking and were not claimed from
unavailable target runtimes.

## Evidence

### RED

The first contract run was intentionally executed before the adapter existed:

```text
pnpm test -- src/workers/__tests__/image.worker.test.ts
Error: Failed to resolve import "@/services/platform/image-processor"
```

### GREEN

After implementing the protocol and adapter:

```text
pnpm test -- src/workers/__tests__/image.worker.test.ts
Test Files  3 passed
Tests       6 passed

pnpm exec vue-tsc --noEmit
exit 0
```

The contract uses a tiny transparent PNG and verifies PNG output, bounded
dimensions, and non-empty output bytes; it also verifies that a worker
execution error rejects the request. The worker implementation checks abort
state before decode, draw, grayscale, and encode; grayscale edits `ImageData`
channels and never uses `ctx.filter`. Results are cached by SHA-256 plus plan,
with input/output buffers transferred by the protocol. The adapter rejects
all pending requests if the worker itself errors and cleans up abort listeners.

## Required release-blocking manual matrix

These checks must be run in the actual release builds and recorded with exact
OS, engine, Tauri/WebView version, and pass/fail evidence. No result is
invented here.

| Target                 | JPEG                                 | alpha PNG | animated GIF (first frame) | WebP    | HTML5 chapter reorder / editor file drop / clipboard image paste with `dragDropEnabled: false` | representative EPUB Send to Kindle/Paperwhite |
| ---------------------- | ------------------------------------ | --------- | -------------------------- | ------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| macOS 12 WKWebView     | NOT RUN — target runtime unavailable | NOT RUN   | NOT RUN                    | NOT RUN | NOT RUN                                                                                        | NOT RUN                                       |
| Windows WebView2       | NOT RUN — target runtime unavailable | NOT RUN   | NOT RUN                    | NOT RUN | NOT RUN                                                                                        | NOT RUN                                       |
| Ubuntu 22.04 WebKitGTK | NOT RUN — target runtime unavailable | NOT RUN   | NOT RUN                    | NOT RUN | NOT RUN                                                                                        | NOT RUN                                       |

Until every cell has evidence, release approval is blocked. In particular,
this document does not claim native drag/drop, clipboard, Kindle delivery, or
engine compatibility from the host Vitest run.

## Files

- `src/types/platform.ts`: stable image processing interface.
- `src/workers/image.worker.ts`: worker protocol and browser implementation.
- `src/services/platform/image-processor.ts`: request/response adapter.
- `src/workers/__tests__/image.worker.test.ts`: contract test and tiny PNG.
- `vite.config.ts`: ES worker output configuration.

## Self-review

- Pure/domain code does not import Vue, Pinia, or Tauri.
- The adapter is isolated under `services/platform`.
- Future Rust fallback must retain `ImageProcessor` exactly.
- Target-runtime and Kindle checks remain explicitly unresolved rather than
  being inferred from mocks or the local browser test environment.

## Commit

Commit: fix round commit to be recorded after commit.
