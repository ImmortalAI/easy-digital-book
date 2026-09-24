# UI migration to shadcn-vue and Tabler Icons — specification

- **Date:** 2026-09-22
- **Status:** design approved, implementation plan not yet written
- **Solution source:** brainstorm 2026-09-22
- **Base specification:** `docs/superpowers/specs/2026-09-15-easy-digital-book-design.md`

## 1. Task and scope

The app is built on Tailwind CSS 4 and shadcn-vue, but only one component
from the registry is installed — `ui/button/Button.vue`, and it is not
imported anywhere. Instead of the library, 31 custom components (~2770 lines)
and 491 lines of global CSS are in use. Dialogs are bare `div` with `fixed
inset-0`, no portals or focus trap. Icons are text glyphs `📄 ⌕ ⚙ ▸ ▾ + × ↑
↓ ⚠ ★ ↔ ⌄`.

**Included in task**

- Replace custom primitives with shadcn-vue components (style `reka-nova`).
- Four wrappers over Reka UI where the registry has no shadcn-vue component.
- Replace all text glyphs with Tabler Icons + accessible button names.
- Move app CSS from `style.css` to components with Tailwind utilities.
- Bring dark theme to life: `settings.theme` + toggle in Settings.
- Translate tests to role-based and accessible name queries.

**Not included**

- Change main window layout. Variant "B v2" from base specification (activity
  panel → sidebar → source/preview) stays as is.
- New visual language. User's solution — "swap + polish": app stays
  recognizable, execution changes, not appearance.
- Domain logic: `services/*`, stores and composables — except three point
  changes: `settings.theme` and new `use-theme` (§4.3), remove `use-resizable`
  (§6.2), slim `stores/notifications` (§7). Full list of untouched in §12.
- Web fonts. App is offline and desktop, stack stays system.

## 2. Brainstorm solutions

| Topic              | Solution                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| Depth of changes   | Swap insides + polish, layout B v2 unchanged                                 |
| Dark theme         | Bring to life: `system` by default + toggle in Settings                      |
| Global CSS         | `style.css` shrinks to tokens and `@layer base`, rest to utilities           |
| Tests              | Translate to roles and accessible names (`@testing-library/vue`, Playwright) |
| `UndoToast`        | To `Toast` primitive from Reka UI, progress bar visual stays custom          |
| `ResizableSplit`   | To `Splitter` from Reka UI, used directly (no shadcn-vue `resizable`)        |
| `ExplorerView`     | To `Tree` primitive from Reka UI                                             |
| `AppToolbar`, lang | To `Toolbar` and `Autocomplete` primitives from Reka UI                      |
| Work order         | Vertical slices, each a commit with green `pnpm check`                       |

## 3. Three layers and where everything comes from

Layers nest inside each other, they are not alternatives:

- **shadcn-vue** — CLI (`node_modules/.bin/shadcn-vue`) and recipe registry at
  `shadcn-vue.com`. Copies sources into `src/components/ui/`, project owns
  them. Style comes from `components.json`, which has `"style": "reka-nova"`;
  component URL — `/r/styles/reka-nova/<name>.json`.
- **Reka UI** — headless primitives on which each shadcn-vue component is built.
  Already a direct dependency, version 2.10.4.
- **Tabler Icons** — `@tabler/icons-vue`, in `components.json` declared as
  `"iconLibrary": "tabler"`.

**32 of 36 primitives come from shadcn-vue:** 31 installed via `shadcn-vue add`
command (list in §5.1), `button` already installed. Four are written manually
on top of Reka UI because the registry index (66 items) has no such components:
`toast`, `tree`, `toolbar`, `autocomplete`. Closest relative for notifications
in the registry is `sonner`, it does not support timer pause and custom progress
bar, so it doesn't fit (see §7).

## 4. Tokens, fonts, theme

### 4.1. `style.css`

File is reduced to three blocks: `@theme inline` with token mapping, `:root`
and `.dark` with values, `@layer base`. App rules (~370 lines, classes
`.editor-shell__*`, `.explorer-chapter`, `.app-toolbar__mode`,
`.warnings-popover__*`, `.status-badge`, `.breadcrumbs`, `.editor-activity`,
`.resizable-split__*`) are deleted as their components move to utilities. No
empty or deleted rules remain at the end.

Comments explaining non-trivial panel flex geometry are not lost: each moves
to the template of the component whose geometry it explains.

### 4.2. Fonts

`components.json` declares `"font": "geist-sans"` and `"fontHeading": "inter"`,
while `style.css` sets system stack. Due to mismatch, CLI will substitute Geist
into each new component. System stack remains, `components.json` is aligned
with it.

### 4.3. Theme

- `settings.theme: "light" | "dark" | "system"`, default `"system"`. Key
  `theme` is added to settings store `load()` and `persist()`.
- `composables/use-theme.ts` attaches class `dark` to `document.documentElement`;
  for `"system"`, watches `prefers-color-scheme` via `useMediaQuery` from
  `@vueuse/core` (already a dependency).
- In `SettingsView` — `select` with icons `IconSun`, `IconMoon`,
  `IconDeviceDesktop`. Localization keys `settings.theme`,
  `settings.themeLight`, `settings.themeDark`, `settings.themeSystem` added
  to `ru.json`, `en.json`, `zh-CN.json`.

Each component after migration is checked in both themes.

## 5. Primitives layer

### 5.1. From shadcn-vue (`shadcn-vue add`)

`alert`, `alert-dialog`, `aspect-ratio`, `badge`, `breadcrumb`, `card`,
`checkbox`, `collapsible`, `context-menu`, `dialog`, `empty`,
`field`, `input`, `input-group`, `item`, `kbd`, `label`, `number-field`,
`popover`, `progress`, `radio-group`, `scroll-area`, `select`,
`separator`, `spinner`, `switch`, `textarea`, `toggle-group`, `tooltip`.

`button` already installed. `combobox` and `resizable` were installed at first
but removed after the migration: `ui/autocomplete` carries its own copy of the
combobox classes (§5.2), and `ResizableSplit` uses Reka `Splitter*` directly (§6).

### 5.2. Written manually on top of Reka UI

| Wrapper           | Reka primitives                                                                                         | Classes taken from |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------ |
| `ui/toast`        | `ToastProvider`, `ToastPortal`, `ToastViewport`, `ToastRoot`, `ToastTitle`, `ToastAction`, `ToastClose` | `alert`            |
| `ui/tree`         | `TreeRoot`, `TreeItem`                                                                                  | `item`             |
| `ui/toolbar`      | `ToolbarRoot`, `ToolbarToggleGroup`, `ToolbarToggleItem`, `ToolbarSeparator`                            | `toggle-group`     |
| `ui/autocomplete` | `AutocompleteRoot`, `AutocompleteInput`, `AutocompleteContent`, `AutocompleteItem`, `AutocompleteEmpty` | `combobox`         |

`combobox` from the registry is built on `Combobox` primitive — "value from
list" model. For book language this is wrong: BCP 47 allows any valid tag, and
the field is deliberately native `datalist` today. `AutocompleteRootProps`
`modelValue` is a free string, list only suggests.

Wrappers are in `src/components/ui/` for unified import path, and the entire
directory is formatted with the rest of the code: `ignorePatterns` from
`.oxfmtrc.json` is removed. Previous rule ("Oxfmt does not format
`src/components/ui/**` to preserve minimal diff with registry" — section 1
of base specification) is **overridden**: no code in the project fails
`pnpm format:check`.

Cost of solution: copied CLI components are brought to project style (double
quotes, semicolons, long line wrapping), so updating a component from the
registry will include reformatting in the diff. Diff against the registry stops
being clean the moment the file is edited manually, and they are edited often
in this task.

Each manual wrapper gets a header comment "written manually, do not overwrite
with shadcn-vue CLI". Oxlint checks the directory as before.

## 6. Geometry

`ResizableSplit` moves to `SplitterGroup` / `SplitterPanel` /
`SplitterResizeHandle`, used directly from Reka UI. The shadcn-vue `resizable`
wrapper over them is not used: the handle is styled in `ResizableSplit` itself.

### 6.1. Structure

- Activity panel (48 px) remains **outside** the group: its size doesn't change.
- Outer group `direction="horizontal"`: sidebar (`order 1`) and content
  (`order 2`). Conditionally rendered panels must have `order`.
- Inside content — nested group: source and preview.

### 6.2. Units and constraints

Inside Splitter always works in percentages and converts px constraints itself
(`convertPanelConstraintsToPercent`); `layout` event returns values **in each
panel's units** (`convertLayoutToNativeUnits`). Hence:

- **Sidebar:** `sizeUnit="px"`, `minSize=160`, `maxSize=400`,
  `defaultSize=layout.sidebarWidth`. Stored format is already pixel, no
  conversion needed.
- **Source and preview:** `sizeUnit="%"`, `defaultSize=splitRatio × 100`,
  `minSize` computed reactively from nested group width — i.e., content area
  without activity panel and sidebar, measured via `useElementSize` — as
  `min(50, PANE_MIN / width × 100)`. 50% ceiling needed if window is too narrow
  for two minimums: otherwise both panels would need more than half. `layout`
  event returns percentages, `splitRatio = val[0] / 100`.

Ratio is stored as ratio, not pixels: it survives window resize, pixels don't.

Constants `SIDEBAR_MIN = 160`, `SIDEBAR_MAX = 400`, `PANE_MIN = 240` keep
values and move to panel props. `clampSidebarWidth`, `clampSplitRatio`,
`resizePane`, and `useResizable` are deleted along with
`composables/__tests__/use-resizable.test.ts`: constraints now handled by
the library.

### 6.3. Modes and persist

- Text and Preview modes **collapse** the second panel via `collapse()`
  (`collapsible`, `collapsedSize=0`), not unmount it. This is required:
  section 4a of base specification requires preview iframe created once —
  `v-if` would destroy it with the blob cache. `SplitterPanel` provides
  `collapse()`, `expand()`, `resize()`, `isCollapsed`, `isExpanded`, and
  events `@resize` / `@collapse` / `@expand`.
- Handle between source and preview is hidden outside Split mode.
- Double-click on handle calls `resize(50)` — behavior "return to 50/50".
- `autoSaveId` is not used: it writes to `localStorage`, settings live in
  Tauri store. Persist goes through `@layout` → `layout` store →
  `layout.persist()`, as now.

### 6.4. What this fixes

Today handles are `<button aria-label="Resize sidebar">` with single `pointerdown`:
keyboard doesn't move panels, and role `button` lies to screen reader about it
being a separator. Splitter gives `role="separator"` with `aria-valuenow` and
arrow key resizing (`keyboardResizeBy`).

## 7. Notifications

`ToastStack` and `UndoToast` move to Reka `Toast`.

Reason: `ToastViewport` already listens to `blur`, `focus`, `focusin`,
`focusout`, `pointermove`, `pointerleave`, and `ToastRootImpl` emits `pause`
and `resume`. In our component, `useDocumentVisibility` + `useWindowFocus` +
`computed(paused)` is manual implementation of what the primitive has.

Gained: `aria-live` region with correct announcement order, F8 to jump to
notifications, swipe to close, focus management.

Stays custom: progress bar of remaining time with glowing dot at end, bounce
on enter and exit, `prefers-reduced-motion` → simple fade, stack of up to three
— everything described in section 4b of base specification. Animation attaches
to `data-state` from `ToastRoot`, pause to `pause` / `resume` events.

`stores/notifications.ts` loses what the primitive now handles: notification
lifetime (`duration`) moves to `ToastRoot` prop, queue and three-limit move to
`ToastProvider` and `ToastViewport`. Store remains the source of notification
list and undo actions.

Side effect: CSS has `.undo-toast--exit` with exit animation, but template
never set it — animation is dead. `data-state="closed"` brings it to life.

## 8. Replacement map

| Current                                  | Becomes                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `ConfirmDialog`, `UnsavedChangesDialog`  | `alert-dialog`                                                    |
| `ErrorDetailsDialog`                     | `dialog` + `scroll-area`                                          |
| `ExportDialog` (170 lines with own CSS)  | `dialog` + `field` + `select` + `checkbox` + `progress` + `alert` |
| `ContextMenu` (custom HTML, coordinates) | `context-menu`                                                    |
| `ExplorerSection` (`▸`/`▾`)              | `ui/tree` + `collapsible`                                         |
| `ChapterItem`, `ImageItem`               | `ui/tree` + `item` + `badge` + icon `button`                      |
| `SearchResultItem`                       | `item` + icon `button`                                            |
| `ActivityBar` (`📄 ⌕ ⚙`)                 | `toggle-group` + `tooltip`                                        |
| `AppToolbar` (Text/Split/Preview)        | `ui/toolbar` + `kbd`                                              |
| `ResizableSplit`                         | Reka `Splitter*` (see §6)                                         |
| `Breadcrumbs` (row with `›`)             | `breadcrumb`                                                      |
| `StatusBadge`, chapter counters          | `badge`                                                           |
| `WarningsPopover`                        | `popover` + `badge` + `scroll-area`                               |
| `LanguageCombobox` (native `datalist`)   | `ui/autocomplete`                                                 |
| `MetadataForm`                           | `field` + `input` + `textarea` + `number-field` + `separator`     |
| `ContributorsList` (`↑ ↓ ×`)             | `field` rows + icon buttons                                       |
| `CoverPicker`                            | `card` + `aspect-ratio` + `empty` (drop zone)                     |
| `SettingsView`                           | `card` + `radio-group` + `switch` + `select` + theme (§4.3)       |
| `SearchView` (`⌄`, `Aa`, `.*`)           | `input-group` + `toggle-group` + `collapsible`                    |
| `WelcomeView`                            | `card` + `item`                                                   |
| `ToastStack`, `UndoToast`                | `ui/toast` (see §7)                                               |
| "Problems on open" banner                | `alert`                                                           |
| Update badge in `App.vue`                | `alert`                                                           |
| `.editor-shell__dialog-backdrop`         | deleted: overlay and portal inside `dialog` / `alert-dialog`      |

## 9. Icons and accessible names

All text glyphs are replaced with Tabler Icons: `+` → `IconPlus`, `×` →
`IconX`, `↑`/`↓` → `IconArrowUp`/`IconArrowDown`, `▸`/`▾` →
`IconChevronRight` (rotate by `data-state`), `⚠` → `IconAlertTriangle`,
`★` → `IconStar`, `↔` → `IconReplace`, `⌄` → `IconChevronDown`, `⚙` →
`IconSettings`, `📄` → `IconFiles`, `⌕` → `IconSearch`.

Each icon button gets a `tooltip` and accessible name. Today buttons `+` and
`×` in `ChapterItem`, `ExplorerView`, and `ContributorsList` have no accessible
name — screen reader reads them as "plus" and "cross". Names are added to
localization files for all three languages.

Decorative icons inside text buttons get `aria-hidden="true"`.

## 10. Tests

### 10.1. New dependency

`@vue/test-utils` does not compute accessible names, so `@testing-library/vue`
is added to devDependencies. This is not convenience, but requirement of the
chosen strategy: a role query won't find a button without an accessible name,
so the test itself forces those names to appear.

Second argument: after migration, dialogs render via `Teleport` to `body`, and
`wrapper.find()` doesn't see them. `screen.*` queries look in `document.body`
by default.

Playwright has `getByRole` itself, no new e2e dependencies needed.

### 10.2. Barrier

Before the first migration, `e2e/layout.spec.ts` is rewritten from classes to
structural `data-*` anchors and **does not change** until the end of work.
It measures real geometry and remains a fixed reference point while everything
around changes.

Anchors: existing `data-pane`, `data-resizable-split`, `data-activity-bar`
plus new `data-shell`, `data-shell-body`, `data-sidebar`, `data-single-pane`,
`data-single-pane-content`, `data-settings-view`.

Future rule: **roles for interactive elements, `data-*` for geometry.** "Preview
panel" role doesn't express geometry, it has no interactive semantics.

### 10.3. Order within a slice

In each slice, tests are rewritten in the same commit as the component. To
prevent rewriting from becoming fitting to new implementation, the order is:
first run the old test on old component, then new test is formulated in terms
of the same observable behavior, only then the component changes. Checked
behavior before and after matches; only the element lookup method changes.

Existing ~48 `data-*` hooks are deleted together with tests that use them,
except structural ones from §10.2.

## 11. Work order

Each slice is a separate commit with green `pnpm check` and passing e2e.

**Slice 0 — foundation.** `shadcn-vue add` 31 components; four wrappers
(§5.2); tokens, fonts, and theme (§4); `@testing-library/vue` in
devDependencies; barrier `layout.spec.ts` (§10.2).

**Slice 1 — geometry.** `ResizableSplit` → Splitter (§6). Comes early:
barrier is in place, rest is still old, rollback is cheap, further slices
immediately work within final layout.

**Slice 2 — dialogs.** `ConfirmDialog`, `UnsavedChangesDialog`,
`ErrorDetailsDialog`, `ExportDialog`; remove `.editor-shell__dialog-backdrop`
from `App.vue` and `EditorView.vue`.

**Slice 3 — sidebar.** `ActivityBar`, `ExplorerView` → `ui/tree`,
`ContextMenu` → `context-menu`, `SearchView`, `SearchResultItem`.

**Slice 4 — forms.** `MetadataForm`, `ContributorsList`, `CoverPicker`,
`LanguageCombobox` → `ui/autocomplete`, `SettingsView` with theme toggle,
`WelcomeView`.

**Slice 5 — editor chrome.** `AppToolbar` → `ui/toolbar`, `Breadcrumbs`,
`WarningsPopover`, `StatusBadge`, two banners → `alert`.

**Slice 6 — notifications.** `ToastStack`, `UndoToast` → `ui/toast` (§7).

**Slice 7 — cleanup.** Remaining `style.css` down to tokens and `@layer base`;
audit icons and accessible names across all three locales; check each screen
in light and dark theme; final `pnpm check` + `pnpm test:e2e`.

## 12. What stays custom

Primitives have no place here — this is domain logic, not UI patterns:

- `SourceEditor`, `CssEditor` — CodeMirror 6 with custom `StreamLanguage` and
  `Map<chapterId, EditorState>`.
- `PreviewPane` — iframe with CSP in `srcdoc`, blob image cache, proportional
  scroll sync.
- Chapter reordering drag&drop and Alt+↑/↓ — on top of roving focus from `Tree`.
- Drop zone in `CoverPicker` and blob cache for cover preview in `MetadataForm`.
- Progress bar visual of notification (§7).
- `services/*`, `stores/*` except `settings.theme`, `utils/*`.

## 13. Risks

| Risk                                                      | Mitigation                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Moving all CSS to utilities silently breaks panel heights | Barrier §10.2 in place before first migration, unchanged; slice 1 second |
| Rewriting tests masks regression                          | Order §10.3: behavior fixed before component replacement                 |
| `Tree` conflicts with drag&drop and Alt+↑/↓               | Reordering stays our handler on top of roving focus; checked in slice 3  |
| Splitter destroys preview iframe on mode change           | Modes via `collapse()`, not `v-if` (§6.3); checked e2e on blob cache     |
| Portals break dialog unit tests                           | `@testing-library/vue` and queries in `document.body` (§10.1)            |
| CLI overwrites four manual wrappers                       | Header comment in each (§5.2) and note §14                               |
| Loss of comments explaining flex geometry                 | Each moves to template of its component (§4.1)                           |

## 14. Future notes

`ui/toast`, `ui/tree`, `ui/toolbar`, and `ui/autocomplete` are written manually
only because on 2026-09-22 the shadcn-vue registry has no corresponding
components. When they appear, these four files become candidates for replacement
via `shadcn-vue add`. Check when updating shadcn-vue.

`sonner` from the registry is not suitable for `UndoToast` not in style but in
behavior: it provides neither timer pause nor a hook for custom progress bar.
Don't reconsider this solution without changing section 4b of base specification.
