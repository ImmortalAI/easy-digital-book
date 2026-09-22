# easy-digital-book v1 — final fix wave 2 report

Date: 2026-09-22
Base: `528f0e3` (`fix: close final v1 review findings`)
Implementation commit: `fdcd8b4` (`fix: close final v1 residual findings`)
Branch: `feat/edb-v1`

## Scope

Implemented only the two user-approved residual findings from the second final
fix wave. No subagents or reviewers were spawned. Export, release, and other
unrelated delivery behavior was not changed.

## Fixes

### 1. Initial parsing after project lifecycle changes

`createProjectFiles` now resets `layout.center` to the first chapter after
each successful `newBook`, `openPathAfterGuard`, and `restoreRecovery` project
replacement. This makes the existing `EditorView`/`SourceEditor` lifecycle
mount for the new project even when the previous center was metadata, CSS,
image, or settings. The existing `useNovlangParse` lifecycle remains the sole
owner of the shared `chapterParseResults` cache and all-chapter parsing; no
second parser timer or watcher was introduced.

The regression opens a replacement project while metadata is active and
verifies that:

- the center selects the first chapter;
- all chapter parse results exist;
- diagnostics entries exist for all chapters;
- the CodeMirror editor mounts; and
- the preview contains the opened chapter before an edit.

Focused lifecycle tests also verify first-chapter selection for new projects,
ordinary opens, and recovery restores.

### 2. Cover restoration after unrelated edits

Resource undo no longer requires the global project revision to remain equal
to the deletion revision. It still requires the existing generation, book ID,
and deleted-resource guards. Cover restoration additionally requires the
current cover to still equal the post-delete expected cover, so a newer cover
selection is never overwritten.

The focused regression covers deletion, an unrelated chapter edit, and undo;
the existing newer-cover and cross-book-generation regressions remain in the
same suite and pass.

## TDD evidence

Tests were added before production changes.

Initial RED command:

```text
pnpm test -- src/views/__tests__/EditorView.test.ts src/composables/__tests__/use-project-files.test.ts src/composables/__tests__/use-book-search.test.ts
```

Result: expected RED, 3 test files failed, 5 tests failed, 204 tests passed.
The failures were the non-chapter center remaining active for new/open/recovery,
the open replacement having no editor/parser workflow, and the deleted cover
remaining `null` after an unrelated chapter edit.

After the minimal implementation, the same focused command was GREEN: 61 test
files passed and 209 tests passed.

## Verification commands and results

- `pnpm check` — first run reached typecheck/lint successfully but failed
  `oxfmt --check` because the touched `src/composables/use-book-search.ts`
  needed formatting. After `pnpm exec oxfmt src/composables/use-book-search.ts`,
  the rerun passed: 61 test files and 209 tests passed; typecheck, Oxlint, and
  Oxfmt passed.
- `pnpm build` — passed, exit 0. Vite emitted the existing large-chunk
  warning for the approximately 803 kB JavaScript bundle.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` — passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — passed: 9 Rust unit
  tests, 0 failures; 0 main tests; 0 doc tests.
- `git diff --check` — passed before the implementation commit.

The first commit attempt was blocked by the sandbox at `.git/index.lock`; the
verified changes were then committed with the required repository-write
permission as `fdcd8b4`.

## Changed files

- `src/composables/use-project-files.ts` — select the first chapter for new,
  opened, and recovered projects.
- `src/composables/use-book-search.ts` — remove only the incorrect global
  revision requirement from cover restoration.
- `src/views/__tests__/EditorView.test.ts` — replacement-open regression with
  parser, diagnostics, editor, and preview assertions.
- `src/composables/__tests__/use-project-files.test.ts` — new/open/recovery
  center-reset regressions.
- `src/composables/__tests__/use-book-search.test.ts` — unrelated-edit cover
  undo regression.

## Self-review

The final implementation diff contains only the five files above. The parser
cache remains shared, parsing remains driven by the existing mounted
`useNovlangParse` lifecycle, and no additional debounce/watch registration was
added. The cover undo path still refuses cross-book or cross-generation undo,
still refuses to replace a newer cover, and now correctly restores the prior
cover after an unrelated chapter revision.

## Environment limits

All requested local frontend and Rust checks ran successfully in this
environment. No additional environment limit affected this fix wave. The
production build warning about the large JavaScript chunk is pre-existing and
non-fatal; no e2e or cross-platform native-runtime checks were part of this
fix wave.
