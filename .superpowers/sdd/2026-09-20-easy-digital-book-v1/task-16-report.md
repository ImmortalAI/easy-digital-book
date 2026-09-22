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

## Fix round 1 from `e129fa9`

- Replace-all undo is now all-or-nothing: every affected chapter revision must still match; stale work disables the action and cannot partially revert.
- `replaceOne` receives the original `SearchQuery`, expands regex captures, and rejects stale or invalid ranges before creating a transaction.
- Search results preserve regex errors, localize them, group/collapse/hide by chapter, show replacement previews, support one/chapter/all replacement and Mod+Alt+Enter, and emit exact selection ranges to `EditorView`.
- Explorer now uses common context menus for chapter/image actions, confirmation details, unused-image deletion, resource undo, and current-chapter neighbor selection.
- ConfirmDialog focus/Escape/ask-again behavior and UndoToast pause/animation/reduced-motion behavior were hardened.
- All new visible strings and regex errors were added to RU/EN/zh-CN; dead notification mutation API was removed.

Fix-round verification:

- `pnpm test -- src/composables/__tests__/use-book-search.test.ts src/components/common src/components/sidebar/SearchView.test.ts` — 48 files, 162 tests passed.
- `pnpm check` — passed.
- `pnpm build` — passed; Vite emitted only the existing >500 kB chunk warning.

## Fix round 2 (2026-09-22)

### Findings addressed

1. **Unused-resource deletion confirmation**

   `ExplorerView` now represents an unused-resource deletion as an explicit
   target containing the affected resource paths. It has its own localized
   title and message, and the confirmation details list the actual image
   names rather than falling through to chapter wording/word counts. The
   confirmation captures the affected paths before opening, and confirmation
   deletes exactly that set. The existing `settings.confirmDelete` and
   “do not ask again” persistence path remains shared with chapter/image
   deletion. `ConfirmDialog` focus and Escape cancellation behavior remains
   unchanged and is still covered by its component contract test.

2. **Used-image confirmation details**

   Image usage still stores stable chapter IDs internally, but confirmation
   details now resolve those IDs through the current book and display each
   chapter heading, with the existing localized fallback for untitled
   chapters. Internal IDs are no longer shown to users.

3. **Cover deletion invariant**

   `removeResource` now clears `metadata.cover` when the removed path is the
   current cover. `useBookSearch.deleteResource` already snapshots the prior
   cover for undo, so the existing resource undo now restores both the
   resource bytes and cover metadata. A component regression test covers the
   complete select-cover → delete → undo sequence.

4. **Search group hide regression**

   Search group hiding now removes the hidden group from the rendered DOM via
   a keyed `v-for` template and `v-if`, keeping it distinct from the existing
   collapse behavior. The component test asserts the hidden group disappears
   while another group remains available.

### Tests added/updated

- `ExplorerView.fix.test.ts`: unused-resource confirmation title/details and
  deletion action; used-image chapter-name details; cover clearing and undo
  restoration.
- `SearchView.fix.test.ts`: actual group hiding, distinct from collapse.

### Verification

- RED run before implementation: 4 expected failures across the new cover,
  unused-resource, used-image-details, and group-hide assertions.
- Focused Task 16 command: 48 files, 165 tests passed.
- `pnpm check`: TypeScript typecheck, Oxlint, Oxfmt, and full Vitest suite
  passed; 48 files and 165 tests passed.

No Task 17 or EPUB export code was changed.
