# easy-digital-book v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 desktop editor that stores one NovLang book in `.edb` and exports a Kindle-compatible EPUB3.

**Architecture:** Keep the full `Book` in Pinia memory, with pure services for book manipulation, `.edb`, checks, search, and EPUB generation. Put all Tauri calls behind interfaces in `types/platform.ts`; Vue components communicate only with stores and composables. Deliver risky platform pieces as measured prototypes first, then retain one stable `ImageProcessor` and filesystem interface for the product.

**Tech Stack:** Tauri 2, Vue 3, Vite, TypeScript, Pinia, Tailwind CSS 4, shadcn-vue, CodeMirror 6, novlang-js, JSZip, valibot, vue-i18n, idb, VueUse, Vitest, Playwright, Rust.

**Spec:** `docs/superpowers/specs/2026-09-15-easy-digital-book-design.md`

## Global Constraints

- Preserve Tauri identifier `com.immortalai.edb`; IndexedDB recovery data depends on the WebView origin.
- Support desktop Windows 10+, macOS 12+, and Linux with WebKitGTK 4.1 / Ubuntu 22.04; do not add a web or mobile product.
- One window holds one `Book`; `.edb` is a deterministic ZIP with UTF-8/LF chapter sources and stable eight-character lowercase IDs.
- Pure `services/{book,edb,epub,search,checks}` and `utils` must not import Vue, Pinia, Tauri, or DOM APIs; dependencies for time, hashing, images, progress, and cancellation are injected.
- Import `@tauri-apps/*` only from `src/services/platform/**`; UI components do not call platform adapters directly.
- Use `@vueuse/core` only for `useDebounceFn`, `useEventListener`, `useDocumentVisibility`, and `useWindowFocus`; native dialogs, filesystem scope, settings, and recovery stay in Tauri/IndexedDB adapters.
- Never run Oxfmt on `src/components/ui/**`; Oxlint still checks it. Keep tests beside their implementation in `__tests__/`.
- EPUB is EPUB3; `mimetype` is first, stored, and has no extra fields. The product writes only `.edb` and `.epub` to disk.
- No telemetry, no updater plugin, no file-drop opening of `.edb`, no e2e against a real WebView in v1.

## Review Focus

- A malformed or newer `.edb` must leave the currently open, dirty book untouched; Task 5 pins fatal-error behavior.
- A chapter and CSS which reference a missing image must never emit an invalid EPUB resource reference; Tasks 7 and 8 pin removal/rewriting.
- A save that races with a new edit must record the revision serialized, not mark the later edit saved; Task 14 pins this race with deferred promises.
- Book-wide regex replacement must not offer a stale global undo after any affected chapter changes; Task 16 pins this condition.
- A temporary filesystem denial, an IDB quota error, or an image-worker failure must retain edits and surface one localized error without leaking book text; Tasks 2, 3, 10, and 17 pin these paths.

## File Structure

| Area       | Files                                                                                              | Responsibility                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Tooling    | `package.json`, `vite.config.ts`, `oxlint.config.ts`, `vitest.config.ts`, `src/test/setup.ts`      | dependencies, aliases, DOM test environment, import boundaries                    |
| Domain     | `src/types/{book,manifest,diagnostics,errors,platform}.ts`, `src/utils/**`, `src/services/book/**` | environment-free model, errors, stable IDs, metadata, chapter/resource operations |
| Containers | `src/services/edb/**`, `src/services/epub/**`, `src/assets/epub/**`                                | deterministic project read/write and EPUB construction                            |
| Platform   | `src/services/platform/**`, `src-tauri/**`                                                         | the sole Tauri/IndexedDB boundary and Rust commands/plugins                       |
| State      | `src/stores/{project,layout,diagnostics,settings,notifications}.ts`                                | application state, revisions, UI layout, notifications                            |
| Editing    | `src/composables/**`, `src/components/editor/**`, `src/components/layout/**`                       | CodeMirror, parse lifecycle, preview, shortcuts and resizable window              |
| UI         | `src/views/**`, `src/components/{sidebar,metadata,export,settings,common}/**`                      | welcome, editor, explorer, forms, export and dialogs                              |
| Delivery   | `e2e/**`, `scripts/**`, `.github/workflows/**`, `docs/release-checklist.md`                        | browser e2e, epubcheck fixtures, CI, releases and manual checks                   |

## Task 1: Establish the application test and dependency foundation

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json`, `src/main.ts`, `src/App.vue`
- Create: `vitest.config.ts`, `oxlint.config.ts`, `src/test/setup.ts`, `src/plugins/i18n.ts`, `src/plugins/__tests__/i18n.test.ts`, `src/locales/{ru,en,zh-CN}.json`, `src/views/WelcomeView.vue`
- Remove: `src/stores/counter.ts`, `src/stores/__tests__/counter.test.ts`

**Interfaces:**

- Produces `createI18nPlugin(initialLocale: SupportedLocale)` and a Vitest `happy-dom` environment used by all Vue tests.
- Produces package scripts `test:coverage`, `test:e2e`, `check`, and `build:fixture-epubs`.

- [ ] **Step 1: Add the runtime and test dependencies.**

```bash
pnpm add @vueuse/core @codemirror/commands @codemirror/lang-css @codemirror/language @codemirror/lint @codemirror/search @codemirror/state @codemirror/view fast-xml-parser idb jszip novlang-js valibot vue-i18n
pnpm add -D @vue/test-utils @vitest/coverage-v8 fake-indexeddb happy-dom playwright tsx
```

- [ ] **Step 2: Replace the counter test with a failing locale-contract test.**

```ts
import en from "@/locales/en.json";
import ru from "@/locales/ru.json";
import zhCN from "@/locales/zh-CN.json";

function keys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === "object"
      ? keys(child as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

it("keeps every locale key aligned with English", () => {
  expect(keys(ru).sort()).toEqual(keys(en).sort());
  expect(keys(zhCN).sort()).toEqual(keys(en).sort());
});
```

- [ ] **Step 3: Configure test, lint, and i18n infrastructure.** Define `SupportedLocale = "ru" | "en" | "zh-CN"`, flatten locale keys for the test, install `createI18n({ legacy: false, locale, fallbackLocale: "en" })`, and make `App.vue` render `WelcomeView` rather than the counter. Configure `happy-dom`, `fake-indexeddb/auto`, Vue aliases, coverage, and Oxlint `eslint/no-restricted-imports` zones.

```ts
export const restrictedImports = [
  {
    target: "src/services/{book,edb,epub,search,checks}/**",
    paths: ["vue", "pinia", "@tauri-apps/api"],
  },
  { target: "src/utils/**", paths: ["vue", "pinia", "@tauri-apps/api"] },
  { target: "src/{stores,composables,components,views}/**", patterns: ["@tauri-apps/*"] },
];
```

- [ ] **Step 4: Run the foundation checks.**

```bash
pnpm test -- src/plugins/__tests__/i18n.test.ts
pnpm lint && pnpm format:check && pnpm build
```

- [ ] **Step 5: Commit the isolated foundation.**

```bash
git add package.json pnpm-lock.yaml vite.config.ts tsconfig.json vitest.config.ts oxlint.config.ts src
git commit -m "chore: establish application tooling"
```

## Task 2: Prove filesystem scope and atomic-write behavior before product wiring

**Files:**

- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/fs_scope.rs`, `src-tauri/src/__tests__/fs_scope.rs`, `docs/decisions/2026-09-20-fs-scope-prototype.md`

**Interfaces:**

- Produces `write_file_atomic(path: String, bytes: Vec<u8>) -> Result<(), CommandError>` and a documented scope decision for Tasks 3 and 14.
- Consumes a persisted-scope plugin and an allowlisted path supplied by a native dialog or OS-open event.

- [ ] **Step 1: Write failing Rust tests for allowed replacement and rejected out-of-scope writes.**

```rust
#[test]
fn atomically_replaces_an_allowed_file() {
    let path = scoped_temp_path("novel.edb");
    write_file_atomic(&scope_with(&path), &path, b"new").unwrap();
    assert_eq!(std::fs::read(path).unwrap(), b"new");
}

#[test]
fn rejects_a_path_not_in_scope() {
    assert_eq!(write_file_atomic(&empty_scope(), Path::new("/outside.edb"), b"x").unwrap_err().code(), "fs.permissionDenied");
}
```

- [ ] **Step 2: Register only the plugins and permissions required for the prototype.** Install `fs` and `persisted-scope` Tauri plugins, add their Rust crates, initialize `persisted-scope` before filesystem use, and grant only the main-window read/write permissions.

```bash
pnpm tauri add fs persisted-scope
(cd src-tauri && cargo add tauri-plugin-fs tauri-plugin-persisted-scope thiserror tempfile)
```

- [ ] **Step 3: Implement atomic writing and path admission.** Create a sibling temporary file, write bytes, call `sync_all`, rename it (with bounded retry on Windows sharing violations), and convert `ScopeError`/`io::Error` to `{ code, message }`. Do not use unrestricted filesystem APIs from the frontend.

```rust
pub fn write_file_atomic(scope: &Scope, path: &Path, bytes: &[u8]) -> Result<(), CommandError> {
    scope.validate(path)?;
    let temporary = temporary_neighbor(path)?;
    std::fs::write(&temporary, bytes)?;
    std::fs::File::open(&temporary)?.sync_all()?;
    replace_with_retry(&temporary, path)
}
```

- [ ] **Step 4: Run the prototype on development and bundled builds, then record the outcome.** Test a path selected through dialog, a path received as an OS launch argument, and the same paths after restart on macOS, Windows, and Ubuntu 22.04. Record exact plugin versions, commands, results, and either `scope validates custom command` or the alternate approved Rust-only scope admission path in the decision document.

```bash
cargo test --manifest-path src-tauri/Cargo.toml fs_scope
pnpm tauri build --debug
```

- [ ] **Step 5: Commit the proven prototype and decision record.**

```bash
git add src-tauri docs/decisions package.json pnpm-lock.yaml
git commit -m "feat(platform): prototype scoped atomic writes"
```

## Task 3: Prove the browser image-processing capability and select its adapter

**Files:**

- Create: `src/workers/image.worker.ts`, `src/services/platform/image-processor.ts`, `src/workers/__tests__/image.worker.test.ts`, `docs/decisions/2026-09-20-image-worker-prototype.md`
- Modify: `src/types/platform.ts`, `vite.config.ts`

**Interfaces:**

- Produces `ImageProcessor.process(input: ImageProcessInput, signal?: AbortSignal): Promise<ProcessedImage>`.
- Produces a recorded choice: worker adapter on all targets, or a Rust `image` adapter with the same TypeScript interface.

- [ ] **Step 1: Write a failing worker contract test using a tiny PNG fixture.**

```ts
it("returns a PNG with constrained dimensions and preserves alpha", async () => {
  const result = await processor.process({
    bytes: transparentPng,
    plan: { width: 10, height: 10, format: "png", grayscale: false },
  });
  expect(result.mediaType).toBe("image/png");
  expect(result.width).toBeLessThanOrEqual(10);
});
```

- [ ] **Step 2: Implement the worker protocol and browser adapter.** Use `createImageBitmap`, `OffscreenCanvas.getContext("2d")`, and `convertToBlob`; apply grayscale by editing `ImageData`, not `ctx.filter`; cache by SHA-256 plus plan. Transfer input/output buffers and check `signal.aborted` before decode, draw, and encode.

```ts
export interface ImageProcessor {
  process(input: ImageProcessInput, signal?: AbortSignal): Promise<ProcessedImage>;
  dispose(): void;
}
```

- [ ] **Step 3: Run automated tests and the three-engine input probe.** Exercise JPEG, alpha PNG, animated GIF first frame, and WebP in macOS 12 WKWebView, Windows WebView2, and Ubuntu 22.04 WebKitGTK. In the same builds with `dragDropEnabled: false`, verify HTML5 chapter reordering, editor file drop, and clipboard-image paste. Record each result, including a Send to Kindle/Paperwhite check using the supplied representative EPUB fixture, in the decision document.

```bash
pnpm test -- src/workers/__tests__/image.worker.test.ts
pnpm tauri dev
```

- [ ] **Step 4: Record the binary decision and implement the selected fallback if required.** If any target lacks one required worker API, add `image` and a Rust command that honors the exact `ImageProcessor` request/response types; otherwise retain the worker as the sole production processor. Document failing engine/version and the final adapter.

```ts
export type ImageProcessInput = { bytes: Uint8Array; plan: ImagePlan };
export type BrowserImageMediaType = "image/jpeg" | "image/png";
export type ProcessedImage = {
  bytes: Uint8Array;
  mediaType: BrowserImageMediaType;
  width: number;
  height: number;
};
```

- [ ] **Step 5: Commit the adapter and evidence.**

```bash
git add src/workers src/services/platform src/types/platform.ts docs/decisions vite.config.ts src-tauri
git commit -m "feat(images): establish portable processing adapter"
```

## Task 4: Build core types, utilities, and pure book operations

**Files:**

- Create: `src/types/{book,manifest,diagnostics,errors,platform}.ts`, `src/utils/{bytes,paths,uuid,xml-escape,plural}.ts`, `src/services/book/{create,chapters,metadata,resources,extract-title}.ts` and colocated tests

**Interfaces:**

- Produces `Book`, `Chapter`, `Resource`, `BookMetadata`, `AppError`, `createBook`, `addChapter`, `removeChapter`, `moveChapter`, `updateMetadata`, `importImage`, `removeResource`, `setCover`, `setCustomCss`, and `extractTitle`.
- Consumes injected `now`, `newId`, and `sha256` rather than environment globals.

- [ ] **Step 1: Write failing domain tests for a localized new book, title extraction, IDs, and resource deduplication.**

```ts
it("reuses a resource when its SHA-256 matches", async () => {
  const result = await importImage(book, "other name.png", png, { sha256: () => hash });
  expect(result).toEqual({ path: "images/cover.png", inserted: false });
});
```

- [ ] **Step 2: Define immutable-facing model contracts and test fixtures.** Model resource bytes as `Uint8Array`, paths as `images/<safe-name>.<extension>`, `Series.index` as a number, and nullable metadata fields exactly as the spec states.

```ts
export interface Book {
  metadata: BookMetadata;
  chapters: Chapter[];
  resources: Map<string, Resource>;
  customCss: string | null;
}
export interface Chapter {
  id: string;
  source: string;
}
export interface Resource {
  bytes: Uint8Array;
  mediaType: ImageMediaType;
}
```

- [ ] **Step 3: Implement the smallest pure transformations.** Detect JPEG/PNG/GIF/WebP from magic bytes, normalize filenames to ASCII lowercase dash names, append `-2`/`-3`, normalize LF, and make every operation return a new `Book` plus changed/removed keys.

```ts
export type BookMutation = {
  book: Book;
  changedChapters: Set<string>;
  removedChapters: Set<string>;
  changedResources: Set<string>;
  removedResources: Set<string>;
};
```

- [ ] **Step 4: Run the domain suite and complete type checking.**

```bash
pnpm test -- src/services/book src/utils
pnpm build
```

- [ ] **Step 5: Commit the domain layer.**

```bash
git add src/types src/utils src/services/book
git commit -m "feat(book): add pure book model operations"
```

## Task 5: Implement `.edb` manifest validation, migration, and deterministic ZIP serialization

**Files:**

- Create: `src/services/edb/{manifest,migrations,read,write,zip}.ts`, `src/services/edb/__tests__/{read,write,fixtures}.test.ts`
- Modify: `src/types/manifest.ts`, `src/types/errors.ts`

**Interfaces:**

- Produces `readEdb(bytes, deps): Promise<ReadEdbResult>` and `writeEdb(book, now): Promise<Uint8Array>`.
- `ReadEdbResult = { book: Book; warnings: AppWarning[]; migrated: boolean }`; fatal errors throw `AppError`.

- [ ] **Step 1: Write fixtures and failing tests for all fatal and recovery cases.** Cover non-ZIP, missing/bad manifest, foreign format, newer format, missing chapter, orphan chapter, invalid metadata, missing cover, CRLF, and an old format migration.

```ts
await expect(readEdb(notZip, deps)).rejects.toMatchObject({ code: "edb.notZip" });
expect(result.book.chapters.at(-1)?.id).toBe("orphan01");
expect(result.warnings.map((warning) => warning.code)).toContain("edb.missingChapter");
```

- [ ] **Step 2: Define the valibot schema and migration boundary.** Parse the envelope first, reject future versions before accepting content, apply `migrateManifest(manifest, fromVersion)`, and default only invalid individual metadata fields.

```ts
export const CURRENT_EDB_FORMAT_VERSION = 1;
export const ManifestSchema = object({
  format: literal("easy-digital-book"),
  formatVersion: number(),
  book: unknown(),
  chapters: array(object({ id: string() })),
});
```

- [ ] **Step 3: Implement reader and deterministic writer.** Sort entries as manifest, chapters in manifest order, images lexically, CSS last; set one fixed ZIP date; DEFLATE text and STORE image media types. Serialize `modified` only when ProjectStore requests a save with changes.

```ts
export async function writeEdb(book: Book, now: Date): Promise<Uint8Array> {
  return buildDeterministicZip(entriesForBook(book, now));
}
```

- [ ] **Step 4: Prove byte determinism and round trips.**

```bash
pnpm test -- src/services/edb
```

- [ ] **Step 5: Commit the `.edb` container implementation.**

```bash
git add src/services/edb src/types/manifest.ts src/types/errors.ts
git commit -m "feat(edb): read and write deterministic projects"
```

## Task 6: Add book checks and the pure book-wide search/replace engine

**Files:**

- Create: `src/services/checks/{book-checks,image-usage}.ts`, `src/services/search/{query,find,replace}.ts` and colocated tests

**Interfaces:**

- Produces `checkBook(book): AppWarning[]`, `findInBook(book, query): SearchResult[]`, `replaceMatches(book, query, replacement): ReplacementPlan`.
- `SearchQuery` contains `text`, `caseSensitive`, `wholeWord`, and `regex`; invalid regex returns `{ error: "search.invalidRegex" }`, never throws to UI.

- [ ] **Step 1: Write failing tests for Cyrillic whole words, regex captures, missing images, and unused images.**

```ts
expect(
  findInBook(book, { text: "герой", wholeWord: true, caseSensitive: false, regex: false }),
).toHaveLength(1);
expect(replaceMatches(book, regexQuery("(глава) (\\d+)"), "$2. $1").changes[0].source).toContain(
  "1. глава",
);
```

- [ ] **Step 2: Implement query compilation with Unicode boundaries and non-overlapping ranges.** Use `(?<![\\p{L}\\p{N}_])` / `(?![\\p{L}\\p{N}_])` with `u`; retain original offsets and replacement text so the editor integration can apply ranges from end to start.

```ts
export interface SearchResult {
  chapterId: string;
  from: number;
  to: number;
  matched: string;
  replacementPreview?: string;
}
```

- [ ] **Step 3: Implement checks from one image-usage scan.** Emit warnings for blank title, missing cover, missing title, and each image reference absent from `book.resources`; make image usage return all referencing chapter IDs.

```ts
export function collectImageUsage(book: Book): Map<string, string[]>;
```

- [ ] **Step 4: Run pure-service tests.**

```bash
pnpm test -- src/services/search src/services/checks
```

- [ ] **Step 5: Commit search and checks.**

```bash
git add src/services/search src/services/checks
git commit -m "feat(book): add checks and book search"
```

## Task 7: Build XHTML chapter rendering and EPUB image planning

**Files:**

- Create: `src/assets/epub/{theme.css,preview.css,chapter.xhtml,title.xhtml,custom.css}.ts`, `src/services/epub/{chapter,resources,file-name,labels}.ts` and colocated tests

**Interfaces:**

- Produces `renderChapter(chapter, index, book, resourceMap): RenderedChapter`, `planImage(meta, options, isCover): ImagePlan`, `makeEpubFileName(metadata, versionInTitle): string`.

- [ ] **Step 1: Write failing tests for XHTML, image substitution, labels, and Windows-safe names.**

```ts
expect(rendered.xhtml).toContain('xmlns:epub="http://www.idpf.org/2007/ops"');
expect(makeEpubFileName({ title: "CON", version: null }, false)).toBe("_CON.epub");
expect(
  planImage({ mediaType: "image/webp", width: 2000, height: 1000 }, paperwhite, false).format,
).toBe("jpeg");
```

- [ ] **Step 2: Implement AST image rewriting and XHTML validation.** Parse with `novlang-js`, remove an image node that lacks a mapped resource, render in XHTML mode, wrap it in the exact XML/XHTML shell, then call `XMLValidator.validate`; turn failure into `export.invalidXhtml` with chapter number and position.

```ts
export type RenderedChapter = {
  id: string;
  title: string;
  xhtml: string;
  referencedPaths: string[];
};
```

- [ ] **Step 3: Implement image plan rules and pure filename/label helpers.** Limit only downward; map GIF to PNG; map WebP to JPEG unless alpha requires PNG; use book-language labels for ru/en/zh-CN and English otherwise; sanitize control characters, reserved names, and the 120-character basename limit.

```ts
export type ImagePlan = {
  width: number;
  height: number;
  format: "jpeg" | "png";
  quality?: number;
  grayscale: boolean;
};
```

- [ ] **Step 4: Run chapter and plan tests.**

```bash
pnpm test -- src/services/epub/chapter src/services/epub/resources src/services/epub/file-name
```

- [ ] **Step 5: Commit EPUB rendering primitives.**

```bash
git add src/assets/epub src/services/epub
git commit -m "feat(epub): render chapters and plan images"
```

## Task 8: Assemble deterministic EPUB3 archives

**Files:**

- Create: `src/services/epub/{build,container,opf,nav,ncx,title-page,zip}.ts`, `src/services/epub/__tests__/build.test.ts`, `scripts/build-fixture-epubs.mts`, `scripts/epubcheck.sh`

**Interfaces:**

- Produces the public `buildEpub(book, options, deps): Promise<Uint8Array>` API from the design spec.
- Consumes `ImageProcessor`, `now`, `AbortSignal`, and progress callback injected by caller.

- [ ] **Step 1: Write a failing full-export test that opens the ZIP and validates structural invariants.**

```ts
const bytes = await buildEpub(bookWithCoverAndFootnote, options, {
  imageProcessor: identityProcessor,
  now: () => new Date("2026-01-02T03:04:05Z"),
});
expect(await firstZipEntry(bytes)).toEqual({
  name: "mimetype",
  compression: "STORE",
  extra: undefined,
});
expect(await textEntry(bytes, "OEBPS/content.opf")).toContain("dcterms:modified");
```

- [ ] **Step 2: Implement title page, OPF, nav, NCX, container, and archive order.** Include title page in spine/landmarks only when selected, nav outside spine, all creator/contributor roles, Calibre series metadata, cover properties, and `book.id` unchanged.

```ts
export interface ExportOptions {
  imagePreset: "kindle-paperwhite" | "original";
  grayscale: boolean;
  titlePage: boolean;
  versionInTitle: boolean;
}
export interface BuildEpubDependencies {
  imageProcessor: ImageProcessor;
  now: () => Date;
  onProgress?: (progress: {
    stage: "chapters" | "images" | "zip";
    done: number;
    total: number;
  }) => void;
  signal?: AbortSignal;
}
export async function buildEpub(
  book: Book,
  options: ExportOptions,
  deps: BuildEpubDependencies,
): Promise<Uint8Array>;
```

- [ ] **Step 3: Implement cancellation, progress, and image cache semantics.** Check the signal between every chapter/image/ZIP stage; emit `{ stage, done, total }`; cache processor output by source SHA-256 and stable JSON of its plan; include only used images plus cover.

```ts
if (deps.signal?.aborted) throw new AppError("export.cancelled");
deps.onProgress?.({ stage: "images", done: index, total: images.length });
```

- [ ] **Step 4: Build fixtures and run epubcheck locally.** Include series, translators, footnotes, images, cover, chapter without heading, and title page; make any epubcheck warning fail.

```bash
pnpm test -- src/services/epub
pnpm build:fixture-epubs && scripts/epubcheck.sh fixtures/*.epub
```

- [ ] **Step 5: Commit the exporter core and fixtures.**

```bash
git add src/services/epub src/assets/epub scripts
git commit -m "feat(epub): build validated EPUB3 archives"
```

## Task 9: Complete Rust platform integration and constrained application configuration

**Files:**

- Modify: `src-tauri/{Cargo.toml,tauri.conf.json,capabilities/default.json,src/lib.rs}`, `package.json`, `pnpm-lock.yaml`
- Create: `src-tauri/src/{error,open_paths}.rs`, `src-tauri/src/__tests__/open_paths.rs`

**Interfaces:**

- Produces `take_pending_open_paths() -> Vec<String>`, `open-paths` event, and production `write_file_atomic` command.
- Registers opener, dialog, fs, store, log, single-instance, persisted-scope, and window-state in the specified order.

- [ ] **Step 1: Write failing path-queue tests.**

```rust
#[test]
fn takes_each_pending_open_path_once() {
    let queue = OpenPathQueue::from(["/tmp/a.edb"]);
    assert_eq!(queue.take(), vec!["/tmp/a.edb"]);
    assert!(queue.take().is_empty());
}
```

- [ ] **Step 2: Add plugins and narrow capabilities.** Use `pnpm tauri add dialog fs store log single-instance persisted-scope window-state`; ensure single-instance is registered first; add matching Rust crates and only permissions used by the main window.

```rust
tauri::Builder::default()
  .plugin(tauri_plugin_single_instance::init(handle_open_args))
  .plugin(tauri_plugin_log::Builder::new().build())
```

- [ ] **Step 3: Implement startup/open forwarding and production config.** Queue launch args, `RunEvent::Opened` paths, and single-instance args; admit `.edb` paths into scope, focus main window, emit `open-paths`. Set 900×560 minimum, `dragDropEnabled: false`, specified CSP, macOS 12 minimum, file association, and version reference to package JSON. Remove `greet`.

```rust
#[tauri::command]
fn take_pending_open_paths(state: State<OpenPathQueue>) -> Vec<String> { state.take() }
```

- [ ] **Step 4: Run Rust format, lint, and tests.**

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

- [ ] **Step 5: Commit the platform backend.**

```bash
git add src-tauri package.json pnpm-lock.yaml
git commit -m "feat(tauri): configure secure desktop platform"
```

## Task 10: Add frontend platform adapters, settings, recovery, and app errors

**Files:**

- Create: `src/services/platform/{fs,dialogs,settings,recovery,logger,opener,updates,index}.ts`, tests for memory adapters and recovery
- Modify: `src/types/{platform,errors}.ts`, `src/test/setup.ts`

**Interfaces:**

- Produces `PlatformServices`, `RecoveryStore`, `SettingsRepository`, `Logger`, `AppError`, and in-memory test implementations.

- [ ] **Step 1: Write failing fake-indexeddb tests for incremental recovery writes and corrupt session deletion.**

```ts
await recovery.writeChanges(book, {
  changedChapters: new Set(["one"]),
  removedChapters: new Set(),
  changedResources: new Set(),
  removedResources: new Set(),
});
expect(await recovery.readChapter(book.metadata.id, "two")).toEqual("unchanged");
await expect(recovery.restore("corrupt")).resolves.toBeNull();
```

- [ ] **Step 2: Define ports before Tauri imports.** Put only interfaces and DTOs in `types/platform.ts`; make adapters translate Tauri `{ code, message }` failures to `AppError`, and expose an `InMemoryPlatformServices` object for all store/component tests.

```ts
export interface PlatformServices {
  files: FileSystem;
  dialogs: Dialogs;
  settings: SettingsRepository;
  recovery: RecoveryStore;
  logger: Logger;
  opener: Opener;
  updates: Updates;
}
```

- [ ] **Step 3: Implement adapters.** Use Tauri dialog/fs/store/log/opener only in this directory; store settings in `settings.json`; create the three IndexedDB stores and make one transaction update the session plus changed/removed rows. Log recovery corruption without source contents.

```ts
export interface RecoveryStore {
  list(): Promise<RecoverySessionSummary[]>;
  restore(bookId: string): Promise<RecoveredBook | null>;
  writeChanges(book: Book, delta: RecoveryDelta): Promise<void>;
  remove(bookId: string): Promise<void>;
}
```

- [ ] **Step 4: Run adapter tests.**

```bash
pnpm test -- src/services/platform
```

- [ ] **Step 5: Commit adapters and fakes.**

```bash
git add src/services/platform src/types/platform.ts src/types/errors.ts src/test
git commit -m "feat(platform): add frontend service adapters"
```

## Task 11: Create Pinia stores for project state, layout, diagnostics, settings, and notifications

**Files:**

- Create: `src/stores/{project,layout,diagnostics,settings,notifications}.ts` and colocated tests

**Interfaces:**

- Produces `useProjectStore`, `useLayoutStore`, `useDiagnosticsStore`, `useSettingsStore`, `useNotificationsStore`.
- Project state is `{ book, filePath, revision, savedRevision, fileMtime, saving }`; `dirty` is derived only from revisions.

- [ ] **Step 1: Write failing store tests for revisions, mutation deltas, serialization races, and notification capacity.**

```ts
project.applyMutation(addChapter(project.book!, context));
expect(project.dirty).toBe(true);
expect(project.revision).toBe(1);
expect(notifications.items).toHaveLength(3);
```

- [ ] **Step 2: Implement stores with injected `PlatformServices`.** Keep `EditorState` maps out of reactive book data; track the recovery delta sets; snapshot `revision` immediately before `.edb` serialization; only assign `savedRevision` to that snapshot after a successful atomic write.

```ts
const savedRevision = ref(0);
const dirty = computed(() => revision.value !== savedRevision.value);
```

- [ ] **Step 3: Implement persisted layout/settings and diagnostic aggregation.** Persist sidebar visibility/width, split ratio, mode, active view, recent files, confirm-delete, and export settings; cap recent files at ten; aggregate parse, book-check, and read warnings.

```ts
export type CenterView =
  | { kind: "chapter"; id: string }
  | { kind: "metadata" }
  | { kind: "css" }
  | { kind: "image"; path: string }
  | { kind: "settings" };
```

- [ ] **Step 4: Run store tests with fake timers.**

```bash
pnpm test -- src/stores
```

- [ ] **Step 5: Commit state management.**

```bash
git add src/stores
git commit -m "feat(state): add project and application stores"
```

## Task 12: Implement parsing, CodeMirror commands, and resilient editor state

**Files:**

- Create: `src/composables/{use-novlang-parse,use-shortcuts}.ts`, `src/components/editor/{SourceEditor.vue,novlang-language.ts,editor-commands.ts}`, and colocated tests

**Interfaces:**

- Produces `useNovlangParse(chapterId)`, `createChapterEditor`, `toggleMarkup`, `insertFootnote`, and per-chapter `Map<string, EditorState>`.

- [ ] **Step 1: Write failing tests for 150 ms parsing, diagnostic offset, bold/italic toggling, and footnote numbering.**

```ts
vi.advanceTimersByTime(149);
expect(parse).not.toHaveBeenCalled();
vi.advanceTimersByTime(1);
expect(parse).toHaveBeenCalledOnce();
expect(insertFootnote(state).state.doc.toString()).toContain("[^2]: ");
```

- [ ] **Step 2: Implement the visual NovLang stream language and commands.** Use a `StreamLanguage` solely for visual tokens, retain soft wrapping/no line numbers, use `@codemirror/lint.setDiagnostics`, and calculate parser-column offsets from `# `, `> `, and `[^id]: ` prefixes.

```ts
export function diagnosticRange(
  source: string,
  position: { line: number; column: number },
): { from: number; to: number };
```

- [ ] **Step 3: Implement parse scheduling and global shortcut filtering.** Call `project.updateChapterSource` synchronously; call VueUse `useDebounceFn(parseCurrent, 150)` only for the parse work; use VueUse `useEventListener(window, "keydown", handler)` and ignore editable controls when a shortcut is not handled by CodeMirror.

```ts
const scheduleParse = useDebounceFn(() => parseAndStore(chapterId), 150);
```

- [ ] **Step 4: Run command and composable tests.**

```bash
pnpm test -- src/composables/__tests__/use-novlang-parse.test.ts src/components/editor/__tests__/editor-commands.test.ts
```

- [ ] **Step 5: Commit editor primitives.**

```bash
git add src/composables src/components/editor
git commit -m "feat(editor): add NovLang CodeMirror editing"
```

## Task 13: Implement preview, resizable layout, and the main editor shell

**Files:**

- Create: `src/components/layout/{AppToolbar,ResizableSplit,Breadcrumbs,StatusBadge}.vue`, `src/components/editor/{PreviewPane,WarningsPopover}.vue`, `src/composables/use-resizable.ts`, `src/views/EditorView.vue` and tests
- Modify: `src/App.vue`, `src/assets/style.css`

**Interfaces:**

- Produces the Text/Split/Preview shell around `layoutStore.center` and a single retained sandboxed preview iframe.

- [ ] **Step 1: Write failing component tests for divider constraints, reset, and iframe security.**

```ts
expect(wrapper.find("iframe").attributes("sandbox")).toBe("allow-same-origin");
expect(wrapper.find("iframe").attributes("srcdoc")).toContain("default-src 'none'");
expect(resize(10)).toBe(240);
```

- [ ] **Step 2: Implement `ResizableSplit` and toolbar modes.** Use pointer capture, 160–400px sidebar bounds, 240px content minima, persisted ratios, and double-click 50/50 reset; disable mode controls for metadata/image/settings.

```ts
export type EditorMode = "text" | "split" | "preview";
```

- [ ] **Step 3: Implement preview without script execution.** Create iframe once via `srcdoc`; update only `contentDocument.body.innerHTML`; build styles as theme + custom CSS + preview CSS; replace only resource paths with cached `blob:` URLs and revoke URLs when resources/project disappear.

```html
<iframe ref="frame" sandbox="allow-same-origin" :srcdoc="initialPreviewDocument" />
```

- [ ] **Step 4: Run component tests and a production build.**

```bash
pnpm test -- src/components/layout src/components/editor
pnpm build
```

- [ ] **Step 5: Commit the primary editor layout.**

```bash
git add src/components/layout src/components/editor src/composables/use-resizable.ts src/views/EditorView.vue src/App.vue src/assets/style.css
git commit -m "feat(ui): add editor shell and secure preview"
```

## Task 14: Implement save/open/new guards, autosave, recovery UI, and OS paths

**Files:**

- Create: `src/composables/{use-autosave,use-unsaved-guard,use-project-files}.ts`, `src/components/common/UnsavedChangesDialog.vue`, tests
- Modify: `src/views/WelcomeView.vue`
- Modify: `src/stores/project.ts`, `src/App.vue`

**Interfaces:**

- Produces `save`, `saveAs`, `openPath`, `newBook`, `guardUnsaved`, recovery restore/discard actions, and open-path listener disposal.

- [ ] **Step 1: Write failing tests for unsaved choices, external mtime, save race, and autosave cadence.**

```ts
await expect(guardUnsaved("open")).resolves.toBe(false); // dialog chose Cancel
deferredWrite.resolve();
await flushPromises();
expect(project.savedRevision).toBe(revisionAtSerialization);
vi.advanceTimersByTime(30_000);
expect(recovery.writeChanges).toHaveBeenCalled();
```

- [ ] **Step 2: Implement save lifecycle against the ports.** Read mtime before overwriting, show overwrite dialog on mismatch, ignore duplicate save during `saving`, preserve `dirty` on failure, remove recovery only after success, and never write on Mod+S when clean.

```ts
async function save(): Promise<boolean> {
  const revisionAtSerialization =
    project.revision; /* serialize, atomic write, mark exactly this revision */
}
```

- [ ] **Step 3: Implement bounded autosave and restoration.** Use VueUse `useDebounceFn(writeIncrementalRecovery, 5_000, { maxWait: 30_000 })` while dirty; first write is full; use recovery newer than file mtime as the restore predicate; notify a failed write once per session while retrying later.

```ts
const scheduleRecovery = useDebounceFn(persistDelta, 5_000, { maxWait: 30_000 });
```

- [ ] **Step 4: Wire native close and OS-open queues.** Fetch `take_pending_open_paths` after mount, listen for `open-paths`, call the same guard/open pipeline for each, and dispose listeners on unmount. Welcome lists up to ten recent files and recovery sessions; missing recent paths are removed after showing `fs.notFound`.

```ts
const unlisten = await platform.files.listenOpenPaths((paths) => paths.forEach(openPath));
onUnmounted(unlisten);
```

- [ ] **Step 5: Run lifecycle tests and commit.**

```bash
pnpm test -- src/composables src/views/__tests__/WelcomeView.test.ts
git add src/composables src/views src/components/common src/stores/project.ts src/App.vue
git commit -m "feat(files): add save recovery and open workflows"
```

## Task 15: Build explorer, metadata, CSS, and image workflows

**Files:**

- Create: `src/components/sidebar/{ActivityBar,ExplorerView,ExplorerSection,ChapterItem,ImageItem}.vue`, `src/components/metadata/{MetadataForm,CoverPicker,ContributorsList,LanguageCombobox}.vue`, `src/components/editor/{CssEditor,ImageView}.vue`, `src/composables/use-image-import.ts`, and tests

**Interfaces:**

- Produces explorer navigation, chapter/image operations, metadata validation, CSS editing, and image import insertion.

- [ ] **Step 1: Write failing tests for language validation, contributor reordering, imported image insertion, and chapter move.**

```ts
expect(validateLanguage("ru-RU")).toEqual({ valid: true, canonical: "ru-RU" });
expect(insertImageParagraph("text", 4, "images/a.png")).toEqual("text\n\n![](images/a.png)\n");
```

- [ ] **Step 2: Implement metadata and editor views against stores only.** Use `Intl.getCanonicalLocales`; keep UUID/dates readonly; make series index disabled without a series name; initialize CSS from the documented template; display image dimensions, byte size, and `collectImageUsage` links.

```ts
export function validateLanguage(value: string): { valid: boolean; canonical?: string };
```

- [ ] **Step 3: Implement explorer interactions.** Support activity toggle, keyboard chapter navigation, HTML5 chapter DnD, Alt+Arrow movement, context-menu actions, image cover markers, unused deletion entry point, and image import from native dialog, editor drop, and clipboard paste.

```ts
useEventListener(window, "paste", (event) => importClipboardImage(event.clipboardData));
```

- [ ] **Step 4: Run focused view/component tests.**

```bash
pnpm test -- src/components/sidebar src/components/metadata src/composables/__tests__/use-image-import.test.ts
```

- [ ] **Step 5: Commit editing workflow UI.**

```bash
git add src/components/sidebar src/components/metadata src/components/editor src/composables/use-image-import.ts
git commit -m "feat(ui): add explorer metadata and images"
```

## Task 16: Integrate search/replacement and undoable destructive mutations

**Files:**

- Create: `src/composables/use-book-search.ts`, `src/components/sidebar/{SearchView,SearchResultItem}.vue`, `src/components/common/{ContextMenu,ConfirmDialog,UndoToast,ToastStack}.vue`, tests
- Modify: `src/stores/notifications.ts`, `src/stores/project.ts`, `src/components/editor/SourceEditor.vue`

**Interfaces:**

- Produces editor-backed `replaceOne`, `replaceChapter`, `replaceAll`, and generalized notification `{ undo?: () => void; expiresAt }`.

- [ ] **Step 1: Write failing tests for stale replace undo, deletion undo position, animation close, focus/visibility pause, and max-three queue.**

```ts
replaceAll();
project.updateChapterSource("a", "later edit");
expect(notification.undoEnabled).toBe(false);
await wrapper.find(".undo-progress").trigger("animationend");
expect(notifications.items).toHaveLength(0);
```

- [ ] **Step 2: Apply replacement through per-chapter `EditorState` transactions.** Create state for unopened affected chapters, dispatch replacements right-to-left, sync sources to ProjectStore, and record the post-replacement revision per chapter to invalidate only stale global undo.

```ts
export type ReplaceAllUndo = { originals: Map<string, string>; revisionAfter: Map<string, number> };
```

- [ ] **Step 3: Implement confirmation and generic undo toast behavior.** Focus destructive confirmation, Esc cancels, persist “do not ask again”; use CSS animation events for the 8s lifetime and VueUse `useDocumentVisibility` plus `useWindowFocus` to pause, with reduced motion CSS fallback.

```ts
const isVisible = useDocumentVisibility();
const isFocused = useWindowFocus();
const paused = computed(() => isVisible.value !== "visible" || !isFocused.value || hovered.value);
```

- [ ] **Step 4: Run search/notification tests.**

```bash
pnpm test -- src/composables/__tests__/use-book-search.test.ts src/components/common src/components/sidebar/SearchView.test.ts
```

- [ ] **Step 5: Commit search UI and undo UX.**

```bash
git add src/composables/use-book-search.ts src/components/sidebar src/components/common src/stores src/components/editor
git commit -m "feat(ui): add book search and undo notifications"
```

## Task 17: Add export workflow, settings, logging, and user-facing errors

**Files:**

- Create: `src/components/export/ExportDialog.vue`, `src/components/settings/SettingsView.vue`, `src/composables/use-export.ts`, `src/components/common/ErrorDetailsDialog.vue`, tests
- Modify: `src/services/platform/{logger,updates}.ts`, `src/main.ts`, `src/components/layout/AppToolbar.vue`

**Interfaces:**

- Produces cancellable `exportEpub()` and app-level error capture that turns unexpected errors into logging plus a localized detail dialog.

- [ ] **Step 1: Write failing tests for filename preview, cancellation, persisted export choices, and error privacy.**

```ts
await exportEpub({ signal: aborted.signal });
expect(files.writeAtomic).not.toHaveBeenCalled();
expect(logger.error).toHaveBeenCalledWith(expect.not.stringContaining(book.chapters[0].source));
```

- [ ] **Step 2: Implement `ExportDialog` and export composable.** Present non-blocking warnings, preset/grayscale/title-page/version options, disable version option without a version, choose a native output path, pass snapshot/deps to `buildEpub`, show progress, remember last directory/options, and offer `revealItemInDir` after success.

```ts
await buildEpub(snapshotBook(project.book), exportOptions, {
  imageProcessor,
  now: () => new Date(),
  signal,
  onProgress,
});
```

- [ ] **Step 3: Implement settings and error paths.** Settings changes persist through SettingsStore; update checks occur at most daily and only log network errors; global Vue/window/unhandled rejection handlers map errors to `errors.<code>`, copy details, reveal log directory, and create a GitHub issue URL without book content.

```ts
app.config.errorHandler = (error) => reportUnexpectedError(error, platform.logger);
```

- [ ] **Step 4: Run export and error tests.**

```bash
pnpm test -- src/components/export src/components/settings src/composables/__tests__/use-export.test.ts
```

- [ ] **Step 5: Commit export and operational UI.**

```bash
git add src/components/export src/components/settings src/components/common/ErrorDetailsDialog.vue src/composables/use-export.ts src/services/platform src/main.ts src/components/layout/AppToolbar.vue
git commit -m "feat(export): add EPUB export and settings"
```

## Task 18: Add integration coverage, CI, release automation, and manual validation

**Files:**

- Create: `e2e/{playwright.config.ts,app.spec.ts,fixtures/platform.ts}`, `.github/workflows/{ci,release}.yml`, `docs/release-checklist.md`, `CHANGELOG.md`
- Modify: `package.json`, `README.md`, `.gitignore`

**Interfaces:**

- Produces `pnpm test:e2e`, `pnpm check`, reproducible EPUB fixture validation, and cross-platform CI/release workflows.

- [ ] **Step 1: Write the failing browser flow against the in-memory platform.**

```ts
test("new book, save/open, search/replace, undo delete, and export", async ({ page }) => {
  await page.getByRole("button", { name: /new book/i }).click();
  await page.getByRole("textbox").fill("# Chapter 1\nhero");
  await page.keyboard.press("Control+Shift+F");
  await expect(page.getByText(/1 result/i)).toBeVisible();
});
```

- [ ] **Step 2: Configure an e2e Vite mode and test command.** Swap only `PlatformServices` for deterministic in-memory adapters; do not mock pure services or render a different app. Add coverage thresholds for pure services/stores and make the fixture script run epubcheck.

```json
{
  "scripts": {
    "check": "vue-tsc --noEmit && pnpm lint && pnpm format:check && pnpm test",
    "test:e2e": "playwright test",
    "build:fixture-epubs": "tsx scripts/build-fixture-epubs.mts"
  }
}
```

- [ ] **Step 3: Add CI and release workflows.** CI runs pnpm cache/install, typecheck, lint, format, unit coverage, fixture EPUB + epubcheck, Playwright, then Rust fmt/clippy/test across Ubuntu/macOS/Windows. Release on `v*` uses Tauri Action for universal macOS DMG, Windows NSIS, and Ubuntu 22.04 AppImage/deb/rpm, with signing steps conditional on secrets.

```yaml
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      [
        { uses: actions/checkout@v4 },
        {
          run: corepack enable && pnpm install --frozen-lockfile && pnpm check && pnpm build:fixture-epubs && pnpm test:e2e,
        },
      ]
```

- [ ] **Step 4: Run the complete local verification and complete the release checklist.** Verify the actual manual scenarios on all three OS targets: first launch, OS open, HTML DnD, clipboard image, scoped save, recovery, export, epubcheck, and Send to Kindle on Paperwhite.

```bash
pnpm check && pnpm build && pnpm build:fixture-epubs && pnpm test:e2e
cargo fmt --manifest-path src-tauri/Cargo.toml --check && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml
```

- [ ] **Step 5: Commit delivery automation and documentation.**

```bash
git add e2e .github docs/release-checklist.md CHANGELOG.md README.md package.json pnpm-lock.yaml .gitignore
git commit -m "ci: validate desktop releases"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 establish tooling and the four stated risk prototypes; 4–6 implement data, `.edb`, checks, and search; 7–8 cover every EPUB module and validation; 9–10 isolate Tauri/IndexedDB; 11–17 cover state, editor, preview, explorer, metadata, deletion, recovery, export, settings, errors, and logging; Task 18 covers tests, CI, releases, and manual platform validation.
- **Placeholder scan:** No deferred implementation markers are used. Each conditional image-processor branch has a measurable trigger and a named fallback interface.
- **Type consistency:** `Book`, `PlatformServices`, `ImageProcessor`, `BuildEpubDependencies`, `BookMutation`, and `RecoveryStore` are defined before their consuming tasks. Later tasks use those exact names.
- **Review focus:** The five failure modes at the top are exercised in Tasks 3, 6, 8, 14, 16, and 18.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-20-easy-digital-book-v1.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** — a fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end.
- **Native** — I implement every task myself in this session, then one fresh reviewer checks the complete branch.

For this plan I recommend **Subagent-driven**, because the platform prototypes, container format, editor integration, and EPUB output have high-cost interfaces that benefit from independent review at each boundary. Does the plan capture what you want, and which approach should we use?
