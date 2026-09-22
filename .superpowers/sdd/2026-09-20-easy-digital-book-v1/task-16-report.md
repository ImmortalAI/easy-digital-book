# Task 16 report

## Result

Implemented editor-backed book search, replacement, destructive-action confirmation, and undo notifications.

## Verification

- `pnpm test -- src/composables/__tests__/use-book-search.test.ts src/components/common src/components/sidebar/SearchView.test.ts` — 44 files, 149 tests passed.
- `pnpm check` — typecheck, Oxlint, Oxfmt, and the full test suite passed (44 files, 149 tests).
- `pnpm build` — production build passed.

## Changed areas

- `use-book-search` applies right-to-left CodeMirror transactions for open and unopened chapters, tracks per-chapter revisions, synchronizes ProjectStore/recovery deltas, and restores only chapters that are not stale.
- Editor command bridge registers visible CodeMirror views so replacement transactions update the mounted editor without replacing its history.
- Search sidebar and result actions are integrated into the existing `activeView` flow.
- Notifications now support undo callbacks, expiry timestamps, live stale-state checks, and a three-item queue; `UndoToast` pauses on hover, window focus, and document visibility and closes on CSS `animationend`.
- Chapter deletion uses confirmation, persists `settings.confirmDelete`, and offers position-preserving undo. Common `ContextMenu` and `ConfirmDialog` primitives were added.
- Added composable/store/component tests covering stale undo, deletion position, animation close, pause state, queue cap, and search replacement.

## Concern

- Vite reports the existing single production chunk is larger than 500 kB; this is a warning only and does not fail the build.
