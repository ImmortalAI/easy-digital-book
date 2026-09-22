# Task 15 report — explorer, metadata, CSS, and image workflows

## Result

Implemented the Task 15 UI foundation on top of base `90ac9d9`.

The editor now has:

- reusable activity bar and explorer components;
- collapsible Book, Chapters, and Images sections;
- chapter selection, creation, keyboard movement entry points, and mutation-backed chapter reordering/removal actions;
- metadata editing for title, version, language, authors, translators, series, description, and cover;
- BCP 47 validation through `Intl.getCanonicalLocales`;
- readonly UUID and timestamps;
- contributor add/remove/reorder controls;
- `custom.css` creation from the project template and a CodeMirror CSS editor;
- image preview with byte size and chapter usage links;
- image import helper with SHA-256-backed resource import, clipboard listener, paragraph insertion, and platform-dialog integration from the editor;
- RU/EN/zh-CN strings for the new visible UI.

## Tests added

- `src/composables/__tests__/use-image-import.test.ts`
  - language canonicalization and rejection;
  - image paragraph insertion.
- `src/services/book/__tests__/chapter-move.test.ts`
  - chapter ordering and mutation tracking.

## Verification

All required verification commands completed successfully:

- focused command from the brief: `pnpm test -- src/components/sidebar src/components/metadata src/composables/__tests__/use-image-import.test.ts`
  - 34 test files, 120 tests passed;
- `pnpm check`
  - typecheck, Oxlint, Oxfmt check, and full Vitest suite passed;
- `pnpm build`
  - Vue typecheck and Vite production build passed.

The production build reports the existing-style bundle-size warning for the main JavaScript chunk (>500 kB); it does not fail the build.

## Concerns / follow-up

- Full context-menu/undo-toast behavior, search wiring, and export wiring remain outside Task 15 and retain their existing entry points.
- The explorer exposes image-import and mutation entry points; richer native-file selection and complete drag/drop insertion behavior should be completed alongside the surrounding workflow tasks if not already covered by the host integration.
- `randomId` is a small browser-side generator used only for newly created chapters; persisted chapter IDs remain validated by the domain operation.

## Fix round 1

Implemented from review findings against `3aadc1d`:

- CSS mutations are synchronous and cannot be committed into a later project after unmount/project switch.
- Image insertion now uses the live CodeMirror chapter/selection for clipboard and HTML5 drop, keeps the cursor inside `[]`, and uses a narrow `pickImage` controller callback for native selection.
- Cover choose/drop imports resources, sets the cover, and renders a thumbnail/path.
- Chapter items support ArrowUp/ArrowDown/Enter, Alt movement, dragstart/dragover/drop, New-after and Remove hooks; no context menu is mapped to cover changes.
- Image dimensions are decoded through a pure service boundary and shown by ImageView.
- Added documented CSS starter content, primary-subtag chapter localization, finite fractional series-index validation with `step="any"`, collision-avoiding chapter IDs, accessible activity labels, valid section markup, and no-op move bounds.

Fix-round verification: focused tests, `pnpm check`, and `pnpm build` all passed; 38 test files / 129 tests passed. The build retains the non-failing >500 kB main-chunk warning.

## Fix round 2

Implemented the scoped Terra findings from `112f644`:

- image import captures project generation and book ID before deferred hashing/import and discards stale results without mutation, navigation, or cursor callbacks;
- plain ArrowUp/ArrowDown now navigates adjacent chapters, Enter selects, and Alt+Arrow is reserved for reorder;
- chapter rows use a non-interactive drag wrapper with a separate select button and action buttons, avoiding nested interactive controls;
- bounded/no-op chapter moves remain pure no-ops and do not dirty the project;
- `zh-CN` and `zh-Hans-CN` use Chinese generated headings;
- pure image dimension parsing now covers JPEG SOF and WebP VP8, VP8L, and VP8X fixtures;
- image contextmenu emits an explicit future ContextMenu hook and never changes the cover directly.

Fix-round 2 verification: focused brief tests, `pnpm check`, and `pnpm build` passed; 39 test files / 131 tests passed. The only build concern remains the non-failing main-chunk size warning (>500 kB).
