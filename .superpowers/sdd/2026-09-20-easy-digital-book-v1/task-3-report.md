# Task 3 report — browser image-processing adapter

## Work performed

- Established the shared `ImageProcessor` TypeScript contract (`ImagePlan`, input, output, and lifecycle types).
- Implemented a browser worker adapter using `createImageBitmap`, `OffscreenCanvas`, `convertToBlob`, SHA-256 + plan caching, transferred input/output buffers, and cancellation checks around decode/draw/grayscale/encode.
- Added grayscale processing through `ImageData` channel edits (no `ctx.filter`).
- Added adapter handling for worker protocol errors and disposal; pending operations reject and abort listeners are cleaned up.
- Configured Vite workers for ES module output.
- Added a tiny transparent-PNG contract test covering bounded dimensions, PNG output, and a worker execution-error rejection.

## TDD evidence

RED (new worker-error behavior, before implementation):

```text
pnpm test -- src/workers/__tests__/image.worker.test.ts
...
× rejects when the worker reports an execution error 5005ms
Error: Test timed out in 5000ms.
```

The timeout was expected: the adapter had no `worker.onerror` handler, so the promise could not settle.

GREEN (after adding the error handler and cleanup):

```text
pnpm test -- src/workers/__tests__/image.worker.test.ts
Test Files  3 passed (3)
Tests       4 passed (4)
```

## Verification commands and raw results

```text
pnpm test
Test Files  3 passed (3)
Tests       4 passed (4)
```

```text
pnpm run build
✓ built in 168ms
```

```text
pnpm run check
$ vue-tsc --noEmit && pnpm lint && pnpm format:check && pnpm test
$ oxlint
$ oxfmt --check
src-tauri/capabilities/default.json (0ms)
Format issues found in above 1 files.
```

`pnpm run check` is therefore blocked by the pre-existing, out-of-scope formatting issue in `src-tauri/capabilities/default.json`. The changed Task 3 files pass targeted `oxfmt --check`; `vue-tsc`, oxlint, build, focused tests, and full tests pass.

`pnpm tauri dev` and target-runtime checks were not run because the macOS 12 WKWebView, Windows WebView2, and Ubuntu 22.04 WebKitGTK release runtimes are unavailable in this environment.

## Required release-blocking matrix

| Target | JPEG | alpha PNG | animated GIF first frame | WebP | HTML5 reorder / editor drop / clipboard paste (`dragDropEnabled: false`) | Send to Kindle/Paperwhite |
|---|---|---|---|---|---|---|
| macOS 12 WKWebView | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable |
| Windows WebView2 | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable |
| Ubuntu 22.04 WebKitGTK | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable | NOT RUN — target runtime unavailable |

These cells remain release-blocking; no compatibility, drag/drop, clipboard, or Kindle result is inferred from Vitest mocks.

## Changed files

- `src/types/platform.ts`
- `src/services/platform/image-processor.ts`
- `src/workers/image.worker.ts`
- `src/workers/__tests__/image.worker.test.ts`
- `vite.config.ts`
- `docs/decisions/2026-09-20-image-worker-prototype.md`
- this report

## Self-review

- Browser/Tauri integration is isolated under `services/platform`; shared service/domain code is not involved.
- The adapter preserves the exact interface required for a future Rust fallback.
- Worker errors and disposal no longer leave promises hanging.
- Cancellation is checked before each expensive worker stage; aborting the main-thread request removes it from the pending map.
- The test worker is intentionally a protocol fake; it does not substitute for the required target-engine matrix.

## Concerns

- `pnpm run check` remains non-green because of the unrelated existing formatting violation in `src-tauri/capabilities/default.json`.
- All three target engines and the Send to Kindle/Paperwhite flow remain untested and are release-blocking.

Commit: the final commit containing this report is the HEAD commit reported in the handoff.

## Review fix round 1

### Changes

- Added a worker cancel protocol. `BrowserImageProcessor` sends `{ type: "cancel", id }` on abort; the worker tracks each request with an `AbortController`, passes its signal into `processImage`, and safely ignores late responses after the main-thread promise is settled.
- Exported the worker message handler for a deterministic unit test. The test now exercises actual `processImage` behavior with browser API doubles: constrained 20×10 → 10×5 resize, PNG bytes/media type, grayscale channel conversion, alpha preservation, and cancellation before draw.
- Corrected the decision document’s stale GREEN evidence from 3 to 6 tests.

### TDD RED/GREEN evidence

RED before the cancellation implementation:

```text
pnpm test -- src/workers/__tests__/image.worker.test.ts
× sends cancellation to the worker when a request is aborted
AssertionError: expected undefined to match object { type: 'cancel', id: 1 }
```

GREEN after the adapter/worker protocol and direct processing tests:

```text
pnpm test -- src/workers/__tests__/image.worker.test.ts
Test Files  3 passed (3)
Tests       6 passed (6)
```

### Fix-round verification

```text
pnpm test
Test Files  3 passed (3)
Tests       6 passed (6)

pnpm run build
✓ built in 230ms

pnpm exec oxfmt --check <Task 3 files>
All matched files use the correct format.
```

`pnpm run check` still stops at the unrelated pre-existing format issue in
`src-tauri/capabilities/default.json`; Task 3 files, type-check, lint, build,
focused tests, and full tests pass. Target runtime and Kindle matrix cells
remain NOT RUN/release-blocking as documented above.
