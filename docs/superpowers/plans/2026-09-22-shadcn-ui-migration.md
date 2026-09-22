# shadcn-vue and Tabler Icons UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 31 hand-rolled UI components and 491 lines of global CSS with shadcn-vue components, Reka UI primitives and Tabler icons, without changing the approved B v2 window layout.

**Architecture:** Work in vertical slices. Each task replaces one component family, moves its CSS into Tailwind utilities, migrates its tests from `data-*` selectors to role and accessible-name queries, and commits green. A geometry barrier lands first and never changes afterwards, so every later task is measured against a fixed reference. Four primitives that shadcn-vue does not ship are wrapped by hand over Reka UI, each built in the task that first consumes it rather than upfront.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS 4, shadcn-vue (style `reka-nova`), Reka UI 2.10.4, `@tabler/icons-vue`, Pinia, Vitest, `@testing-library/vue`, Playwright, Oxfmt, Oxlint.

**Spec:** `docs/superpowers/specs/2026-09-22-shadcn-ui-migration-design.md`

**Base spec:** `docs/superpowers/specs/2026-09-15-easy-digital-book-design.md`

## Global Constraints

- The window layout does not change. Activity bar → sidebar → source/preview, modes Text/Split/Preview, and every keyboard shortcut behave exactly as they do today.
- `src/assets/style.css` ends this work containing only `@import`s, `@theme inline`, `:root`, `.dark` and `@layer base`. No application-level class rules remain.
- Roles and accessible names address interactive elements. `data-*` attributes address geometry only — a pane has no interactive semantics and cannot be found by role.
- Every task ends with `pnpm check` and `pnpm test:e2e` passing. No task commits red.
- No web fonts. The font stack stays `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; `components.json` is corrected to match, not the other way round.
- Oxfmt formats `src/components/ui/**` like everything else. The exemption was removed on 2026-09-22; do not reinstate it, and do not hand-format around it.
- `services/**`, `utils/**`, `stores/{project,layout,diagnostics}.ts` and the `.edb`/EPUB pipelines are out of scope. The only state changes allowed are `settings.theme` and the slimming of `stores/notifications.ts`.
- Every user-visible string exists in all three locales: `src/locales/{ru,en,zh-CN}.json`. A task that adds a string and skips a locale is incomplete.
- Icons come from `@tabler/icons-vue`. No emoji, no text glyphs, no inline SVG paths. Decorative icons inside labelled controls carry `aria-hidden="true"`.
- The preview iframe is created once and must survive mode switches. Never unmount the preview pane — collapse it.
- Size constraints keep their present values: sidebar 160–400 px, source and preview minimum 240 px each, activity bar 48 px.

## Deviation From the Spec's Slice 0

The spec groups all four hand-written Reka wrappers into slice 0. This plan builds each one inside the task that first consumes it: `ui/autocomplete` in Task 11, `ui/tree` in Task 9, `ui/toolbar` in Task 15, `ui/toast` in Task 17. A wrapper built without a consumer has no test and nothing for a reviewer to judge; built alongside its consumer, it is exercised by that task's tests on arrival. Everything the spec requires still ships — only the order changes.

## Review Focus

- Switching to Text or Preview mode must not destroy the preview iframe or its blob cache. Task 4 pins this.
- A window narrower than two pane minimums must not produce a negative or oversized pane. Task 4 pins this.
- Chapter reordering by drag and by Alt+↑/↓ must keep working on top of the Tree's roving focus. Task 9 pins this.
- Deleting a chapter must still offer undo, and the undo timer must still pause when the window loses focus. Task 17 pins this.
- Every icon-only control must expose an accessible name in all three locales. Task 18 pins this across the app.

## File Structure

| Area         | Files                                                                                   | Responsibility                                        |
| ------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Tokens       | `src/assets/style.css`, `components.json`                                               | theme tokens, base layer, CLI configuration           |
| Theme        | `src/composables/use-theme.ts`, `src/stores/settings.ts`                                | light/dark/system resolution and persistence          |
| Registry UI  | `src/components/ui/**` (31 components from `shadcn-vue add`)                            | styled primitives owned by the project                |
| Hand-written | `src/components/ui/{toast,tree,toolbar,autocomplete}/**`                                | the four primitives shadcn-vue does not ship          |
| Layout       | `src/components/layout/**`, `src/views/EditorView.vue`, `src/App.vue`                   | splitter geometry, toolbar, breadcrumbs, status badge |
| Sidebar      | `src/components/sidebar/**`                                                             | activity bar, explorer tree, search                   |
| Forms        | `src/components/metadata/**`, `src/components/settings/**`, `src/views/WelcomeView.vue` | metadata, settings, welcome                           |
| Dialogs      | `src/components/common/**`, `src/components/export/ExportDialog.vue`                    | confirm, unsaved, error, export, notifications        |
| Test harness | `e2e/**`, `src/test/setup.ts`, `vitest.config.ts`                                       | geometry barrier and role-based queries               |

---

## Task 1: Install the primitive layer and align the CLI configuration

**Files:**

- Modify: `components.json`, `package.json`, `pnpm-lock.yaml`
- Create: `src/components/ui/**` (31 component folders written by the CLI)

**Interfaces:**

- Produces every registry component later tasks import from `@/components/ui/<name>`.
- Produces `@testing-library/vue` in devDependencies, used by every component test from Task 5 onward.

- [ ] **Step 1: Correct the font declaration so the CLI stops injecting Geist.**

In `components.json`, set both font fields to the system stack already used by `style.css`:

```json
  "font": "system",
  "fontHeading": "system",
```

- [ ] **Step 2: Install the 31 registry components.**

```bash
pnpm exec shadcn-vue add -y alert alert-dialog aspect-ratio badge breadcrumb card \
  checkbox collapsible combobox context-menu dialog empty field input input-group \
  item kbd label number-field popover progress radio-group resizable scroll-area \
  select separator spinner switch textarea toggle-group tooltip
```

- [ ] **Step 3: Verify the CLI wrote what was asked and nothing else.**

```bash
ls src/components/ui
git status --short src/assets/style.css components.json
```

Expected: 32 folders (31 new plus the existing `button`). If the CLI rewrote `style.css` tokens, revert that file — token values are owned by this project, not the registry.

- [ ] **Step 4: Add the role-query test library.**

```bash
pnpm add -D @testing-library/vue
```

- [ ] **Step 5: Format the new files and confirm the suite is still green.**

The Oxfmt exemption for `src/components/ui/**` was removed, so the CLI output must be formatted before it can be committed.

```bash
pnpm format && pnpm check
```

Expected: PASS, 235 tests.

- [ ] **Step 6: Commit.**

```bash
git add components.json package.json pnpm-lock.yaml src/components/ui
git commit -m "feat(ui): install the shadcn-vue primitive layer"
```

---

## Task 2: Make the dark theme reachable

**Files:**

- Create: `src/composables/use-theme.ts`, `src/composables/__tests__/use-theme.test.ts`
- Modify: `src/stores/settings.ts`, `src/stores/__tests__/stores.test.ts`, `src/main.ts`

**Interfaces:**

- Produces `useTheme(): { theme: Ref<Theme>, resolved: ComputedRef<"light" | "dark">, setTheme(value: Theme): Promise<void> }` with `type Theme = "light" | "dark" | "system"`.
- Produces `settings.theme: Theme`, default `"system"`, persisted under the key `theme`.
- Task 13 consumes `useTheme` to render the Settings switcher.

The switcher UI lands in Task 13 with the rest of `SettingsView`. After this task the app already follows the OS theme; Task 13 adds the manual override.

- [ ] **Step 1: Write the failing composable test.**

```ts
// src/composables/__tests__/use-theme.test.ts
import { describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useTheme } from "@/composables/use-theme";
import { useSettingsStore } from "@/stores/settings";

describe("useTheme", () => {
  it("applies the stored choice and falls back to the OS preference", async () => {
    setActivePinia(createPinia());
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("dark"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const theme = useTheme();
    await nextTick();
    // "system" with an OS preferring dark resolves to dark.
    expect(theme.resolved.value).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await theme.setTheme("light");
    await nextTick();
    expect(theme.resolved.value).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(useSettingsStore().theme).toBe("light");
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/composables/__tests__/use-theme.test.ts
```

Expected: FAIL, cannot resolve `@/composables/use-theme`.

- [ ] **Step 3: Add the settings key.**

In `src/stores/settings.ts`, add `theme` beside `locale` — a `ref<Theme>("system")`, loaded in `load()` via `await repository?.get<Theme>("theme", "system")`, written in `persist()` via `await repository?.set("theme", theme.value)`, and returned from the store.

- [ ] **Step 4: Implement the composable.**

```ts
// src/composables/use-theme.ts
import { computed, watchEffect } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { useSettingsStore } from "@/stores/settings";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const settings = useSettingsStore();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const resolved = computed<"light" | "dark">(() =>
    settings.theme === "system" ? (prefersDark.value ? "dark" : "light") : settings.theme,
  );

  watchEffect(() => {
    document.documentElement.classList.toggle("dark", resolved.value === "dark");
  });

  async function setTheme(value: Theme) {
    settings.theme = value;
    await settings.persist();
  }

  return { theme: computed(() => settings.theme), resolved, setTheme };
}
```

- [ ] **Step 5: Call it once at startup.**

In `src/main.ts`, invoke `useTheme()` after Pinia is installed and settings are loaded, so the class is applied before the first paint.

- [ ] **Step 6: Run the tests.**

```bash
pnpm test -- src/composables/__tests__/use-theme.test.ts src/stores/__tests__/stores.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/composables src/stores src/main.ts
git commit -m "feat(ui): follow the operating system colour scheme"
```

---

## Task 3: Raise the geometry barrier

**Files:**

- Modify: `e2e/layout.spec.ts`, `src/views/EditorView.vue`, `src/components/layout/ResizableSplit.vue`, `src/components/settings/SettingsView.vue`

**Interfaces:**

- Produces the structural anchors every later task must preserve: `data-shell`, `data-shell-body`, `data-sidebar`, `data-single-pane`, `data-single-pane-content`, `data-settings-view`, alongside the existing `data-resizable-split`, `data-pane`, `data-activity-bar`.

This spec is the fixed reference point for the whole migration. After this task **it does not change again** — if a later task makes it fail, the task is wrong, not the barrier.

- [ ] **Step 1: Add the anchors to the current markup.**

Add `data-shell` to `main.editor-shell`, `data-shell-body` to `div.editor-shell__body`, `data-sidebar` to the sidebar `aside`, `data-single-pane` to `section.editor-single-pane`, `data-single-pane-content` to `div.editor-single-pane__content`, and `data-settings-view` to `section.settings-view`. Keep the existing classes for now; Task 18 removes them.

- [ ] **Step 2: Rewrite the barrier onto the anchors.**

Replace every class selector in `e2e/layout.spec.ts`. The assertions and their comments stay byte-identical; only the locators change:

```ts
const SHELL = "[data-shell]";
const BODY = "[data-shell-body]";
const SIDEBAR = "[data-sidebar]";
const SINGLE_PANE = "[data-single-pane]";
const SINGLE_PANE_CONTENT = "[data-single-pane-content]";
const SETTINGS = "[data-settings-view]";
```

`.cm-content`, `.cm-scroller` and `.preview-pane iframe` stay as they are — they belong to CodeMirror and to a component this migration does not touch.

- [ ] **Step 3: Run the barrier against the unmigrated app.**

```bash
pnpm test:e2e -- layout.spec.ts
```

Expected: PASS, 8 tests. A failure here means an anchor is on the wrong element — fix it now, while the old layout still works.

- [ ] **Step 4: Commit.**

```bash
git add e2e/layout.spec.ts src/views/EditorView.vue src/components/layout/ResizableSplit.vue src/components/settings/SettingsView.vue
git commit -m "test(e2e): anchor the layout barrier on structural attributes"
```

---

## Task 4: Replace the hand-rolled split with Reka Splitter

**Files:**

- Modify: `src/components/layout/ResizableSplit.vue`, `src/components/layout/__tests__/ResizableSplit.test.ts`
- Delete: `src/composables/use-resizable.ts`, `src/composables/__tests__/use-resizable.test.ts`

**Interfaces:**

- Consumes `useLayoutStore()` — `sidebarVisible`, `sidebarWidth`, `splitRatio`, `mode`, `persist()`.
- Produces the same four named slots as today: `activity`, `sidebar`, `single`, `source`, `preview`. `EditorView.vue` is not modified.

The riskiest task in the plan. It runs early and alone so that a revert costs one commit.

- [ ] **Step 1: Write the failing tests for the two behaviours that must not regress.**

```ts
// src/components/layout/__tests__/ResizableSplit.test.ts
it("collapses the preview in text mode instead of unmounting it", async () => {
  const wrapper = mount(ResizableSplit, {
    slots: { preview: '<div data-testid="preview-body" />' },
  });
  useLayoutStore().mode = "text";
  await nextTick();
  // The iframe is built once and owns a blob cache; unmounting it loses both.
  expect(wrapper.find('[data-testid="preview-body"]').exists()).toBe(true);
  expect(wrapper.find('[data-pane="preview"]').attributes("data-state")).toBe("collapsed");
});

it("keeps the split ratio as a ratio when the group reports a layout", async () => {
  const layout = useLayoutStore();
  const wrapper = mount(ResizableSplit);
  await wrapper.findComponent({ name: "SplitterGroup" }).vm.$emit("layout", [30, 70]);
  expect(layout.splitRatio).toBeCloseTo(0.3, 5);
});
```

- [ ] **Step 2: Run them and watch them fail.**

```bash
pnpm test -- src/components/layout/__tests__/ResizableSplit.test.ts
```

Expected: FAIL — no `SplitterGroup` in the tree.

- [ ] **Step 3: Rebuild the template on the splitter.**

The activity bar stays outside the group; it is fixed at 48 px and is not resizable. Conditionally rendered panels need an explicit `order`.

```vue
<template>
  <div ref="root" class="flex flex-1 overflow-hidden" data-resizable-split>
    <aside
      class="flex w-12 min-w-12 shrink-0 border-r bg-sidebar"
      data-activity-bar
      data-width="48"
    >
      <slot name="activity" />
    </aside>
    <SplitterGroup direction="horizontal" class="flex flex-1" @layout="onOuterLayout">
      <SplitterPanel
        v-if="layout.sidebarVisible"
        :order="1"
        size-unit="px"
        :min-size="SIDEBAR_MIN"
        :max-size="SIDEBAR_MAX"
        :default-size="layout.sidebarWidth"
        data-sidebar
      >
        <slot name="sidebar" />
      </SplitterPanel>
      <SplitterResizeHandle v-if="layout.sidebarVisible" class="w-1 hover:bg-ring" />
      <SplitterPanel :order="2" class="flex min-w-0">
        <!-- inner group: source and preview -->
      </SplitterPanel>
    </SplitterGroup>
  </div>
</template>
```

- [ ] **Step 4: Express the pane minimum as a live percentage.**

The stored value is a ratio so it survives window resizes; the constraint is in pixels. Convert at the boundary:

```ts
import { useElementSize } from "@vueuse/core";

const content = ref<HTMLElement>();
const { width: contentWidth } = useElementSize(content);
// Cap at 50: in a window narrower than two minimums both panes would
// otherwise demand more than half and the group could not satisfy either.
const paneMin = computed(() =>
  Math.min(50, (PANE_MIN / Math.max(contentWidth.value, PANE_MIN * 2)) * 100),
);
function onInnerLayout(sizes: number[]) {
  layout.splitRatio = (sizes[0] ?? 50) / 100;
  void layout.persist();
}
```

- [ ] **Step 5: Collapse rather than unmount for Text and Preview modes.**

Give both inner panels `collapsible` and `:collapsed-size="0"`, hold template refs to them, and drive the mode with a watcher calling the exposed `collapse()` / `expand()`. Hide the inner handle unless `layout.mode === 'split'`, and reset on double-click with `resize(50)` on both panels.

- [ ] **Step 6: Delete the superseded composable.**

```bash
git rm src/composables/use-resizable.ts src/composables/__tests__/use-resizable.test.ts
```

Move `SIDEBAR_MIN = 160`, `SIDEBAR_MAX = 400` and `PANE_MIN = 240` into `ResizableSplit.vue` as module constants. Confirm nothing else imported them:

```bash
grep -rn "use-resizable" src e2e
```

Expected: no matches.

- [ ] **Step 7: Run the unit tests and the barrier.**

```bash
pnpm test -- src/components/layout && pnpm test:e2e -- layout.spec.ts
```

Expected: PASS. The barrier is the real verdict here.

- [ ] **Step 8: Commit.**

```bash
git add -u && git add src/components/layout
git commit -m "feat(ui): resize panes with the Reka splitter"
```

---

## Task 5: Move the confirm and unsaved dialogs onto AlertDialog

**Files:**

- Modify: `src/components/common/ConfirmDialog.vue`, `src/components/common/UnsavedChangesDialog.vue`, `src/App.vue`
- Modify: `src/components/common/__tests__/ConfirmDialog.fix.test.ts`

**Interfaces:**

- Both components keep their present props and emits exactly. `ExplorerView.vue` and `App.vue` are not restructured.

- [ ] **Step 1: Rewrite the confirm test against roles.**

The dialog now teleports to `document.body`, so `wrapper.find` no longer sees it and `screen` does.

```ts
import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";

it("focuses the destructive action, supports the ask-again choice, and cancels on Escape", async () => {
  const { emitted } = render(ConfirmDialog, {
    props: { open: true, title: "Delete", message: "Details", showAskAgain: true },
  });
  const confirm = await screen.findByRole("button", { name: "Delete" });
  expect(document.activeElement).toBe(confirm);

  await userEvent.click(screen.getByRole("checkbox", { name: /do not ask again/i }));
  await userEvent.keyboard("{Escape}");
  expect(emitted().cancel).toHaveLength(1);
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/common/__tests__/ConfirmDialog.fix.test.ts
```

Expected: FAIL — no element with role `checkbox` and that name; the current markup uses a bare `<input type=checkbox>` with no label association.

- [ ] **Step 3: Rebuild both dialogs.**

Use `AlertDialog`, `AlertDialogContent`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogCancel`, `AlertDialogAction` from `@/components/ui/alert-dialog`, plus `Checkbox` and `Label` for the ask-again row. Drop the hand-written Escape handler and the focus-on-mount watcher — the primitive owns both. Keep `data-confirm-delete` on the confirm action: `e2e/app.spec.ts` uses it and Task 18 retires it.

- [ ] **Step 4: Remove the backdrop the dialogs no longer need.**

Delete the `.editor-shell__dialog-backdrop` wrapper around `ErrorDetailsDialog` in `src/App.vue`. `AlertDialogOverlay` renders it now.

- [ ] **Step 5: Run the tests.**

```bash
pnpm test -- src/components/common && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/components/common src/App.vue
git commit -m "feat(ui): build the confirm and unsaved dialogs on AlertDialog"
```

---

## Task 6: Move the error and export dialogs onto Dialog

**Files:**

- Modify: `src/components/common/ErrorDetailsDialog.vue`, `src/components/export/ExportDialog.vue`, `src/views/EditorView.vue`
- Modify: `src/components/common/__tests__/ErrorDetailsDialog.test.ts`, `src/components/export/__tests__/ExportDialog.test.ts`

**Interfaces:**

- Both keep their present props (`report`/`actions`, `controller`/`project`) and their `close` emit.

- [ ] **Step 1: Rewrite the export test against roles.**

```ts
it("exports with the chosen preset and reports success", async () => {
  render(ExportDialog, { props: { controller, project } });
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: /image preset/i }),
    "original",
  );
  await userEvent.click(screen.getByRole("checkbox", { name: /grayscale/i }));
  await userEvent.click(screen.getByRole("button", { name: /export/i }));
  expect(await screen.findByRole("status")).toHaveTextContent("EPUB saved");
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/export
```

Expected: FAIL — the preset `<select>` has no accessible name; its `<label>` wraps text and the control without a `for`/`id` pair.

- [ ] **Step 3: Rebuild the export dialog.**

`Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogFooter`; `Field` + `Label` + `Select` for the preset; `Checkbox` for the three flags; `Progress` for the stage indicator; `Alert` with `variant="destructive"` for the error and for the warnings list; `Spinner` inside the submit button while `controller.exporting` is true. Delete the entire `<style scoped>` block — every rule in it becomes a utility class.

- [ ] **Step 4: Rebuild the error dialog.**

`Dialog` with `role="alertdialog"`, the stack trace inside `ScrollArea` so a long trace scrolls instead of stretching the dialog, and the four actions in `DialogFooter`. Keep `data-error-details` on the `<pre>`: `e2e/settings.spec.ts` asserts on its absence.

- [ ] **Step 5: Drop the second backdrop.**

Remove the `.editor-shell__dialog-backdrop` wrapper around `ExportDialog` in `src/views/EditorView.vue` and bind `v-model:open` to `exportOpen` instead.

- [ ] **Step 6: Run the tests.**

```bash
pnpm test -- src/components/export src/components/common && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/components/common src/components/export src/views/EditorView.vue
git commit -m "feat(ui): build the error and export dialogs on Dialog"
```

---

## Task 7: Rebuild the activity bar

**Files:**

- Modify: `src/components/sidebar/ActivityBar.vue`
- Create: `src/components/sidebar/__tests__/ActivityBar.test.ts`

**Interfaces:**

- Keeps the `active` prop and the `select` emit unchanged. `EditorView.vue` is not modified.

- [ ] **Step 1: Write the failing test.**

```ts
it("names every activity and reports the selection", async () => {
  const { emitted } = render(ActivityBar, { props: { active: "explorer" } });
  expect(screen.getByRole("button", { name: "Explorer" })).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(emitted().select[0]).toEqual(["search"]);
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/sidebar/__tests__/ActivityBar.test.ts
```

Expected: FAIL — the buttons are labelled by the literal glyphs `📄`, `⌕` and `⚙`.

- [ ] **Step 3: Rebuild on ToggleGroup, Tooltip and Tabler.**

`IconFiles`, `IconSearch`, `IconSettings` at `size-5`, each in a `ToggleGroupItem` wrapped in `Tooltip`, with the settings item pushed down by `mt-auto`. Keep `data-activity` on each item — `e2e/app.spec.ts`, `e2e/layout.spec.ts` and `e2e/settings.spec.ts` all use it, and the barrier must not be touched. Labels come from `t("activity.explorer")`, `t("activity.search")`, `t("activity.settings")`.

- [ ] **Step 4: Add the three keys to all three locales.**

```json
"activity": { "explorer": "Explorer", "search": "Search", "settings": "Settings" }
```

Russian: `Проводник`, `Поиск`, `Настройки`. Chinese: `资源管理器`, `搜索`, `设置`.

- [ ] **Step 5: Run the tests.**

```bash
pnpm test -- src/components/sidebar && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/components/sidebar src/locales
git commit -m "feat(ui): rebuild the activity bar on ToggleGroup and Tabler icons"
```

---

## Task 8: Move the context menu onto the ContextMenu primitive

**Files:**

- Delete: `src/components/common/ContextMenu.vue`, `src/components/common/__tests__/ContextMenu.fix.test.ts`
- Modify: `src/components/sidebar/ExplorerView.vue`, `src/components/sidebar/ChapterItem.vue`, `src/components/sidebar/ImageItem.vue`

**Interfaces:**

- Removes the `context` coordinate state (`{ kind, id, x, y }`) from `ExplorerView.vue`. The menu is now anchored by its trigger, so `openChapterMenu`, `openImageMenu` and the `x`/`y` plumbing all disappear. `selectContextAction(value: string)` survives, taking the target from the item that owns the menu.

- [ ] **Step 1: Write the failing test.**

```ts
it("offers the chapter actions from a right click", async () => {
  render(ExplorerView, { global: { plugins: [pinia] } });
  await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByText("Chapter 1") });
  expect(await screen.findByRole("menuitem", { name: /new chapter after/i })).toBeVisible();
  expect(screen.getByRole("menuitem", { name: /delete/i })).toBeVisible();
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/sidebar/__tests__/ExplorerView.test.ts
```

Expected: FAIL — the current menu renders `role="menu"` with plain buttons and only after a manual coordinate handler runs.

- [ ] **Step 3: Wrap each item in its own menu.**

Put `ContextMenuTrigger` around the chapter row inside `ChapterItem.vue` and around the image row inside `ImageItem.vue`, with `ContextMenuContent` holding that item's actions. The document-level `mousedown` and `keydown` listeners go away — `DismissableLayer` inside the primitive owns dismissal.

- [ ] **Step 4: Confirm the manual listeners are gone.**

```bash
grep -rn "addEventListener(\"mousedown\"\|addEventListener(\"keydown\"" src/components
```

Expected: no matches in `src/components/sidebar` or `src/components/common`.

- [ ] **Step 5: Run the tests.**

```bash
pnpm test -- src/components/sidebar src/components/common && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add -u && git add src/components/sidebar
git commit -m "feat(ui): anchor explorer context menus to their rows"
```

---

## Task 9: Rebuild the explorer as a tree

**Files:**

- Create: `src/components/ui/tree/{Tree.vue,TreeItem.vue,index.ts}`
- Modify: `src/components/sidebar/ExplorerView.vue`, `src/components/sidebar/ChapterItem.vue`, `src/components/sidebar/ImageItem.vue`
- Delete: `src/components/sidebar/ExplorerSection.vue`
- Modify: `src/components/sidebar/__tests__/ExplorerView.test.ts`, `src/components/sidebar/__tests__/ExplorerView.fix.test.ts`, `src/components/sidebar/__tests__/ChapterItem.test.ts`

**Interfaces:**

- Produces `@/components/ui/tree` exporting `Tree` (wraps `TreeRoot`) and `TreeItem` (wraps Reka `TreeItem`), styled with the `item` component's class recipes.
- `ExplorerView` keeps its `import` and `image-context-menu` emits.

The largest task in the plan. `ExplorerView.vue` is 314 lines and carries three test files.

- [ ] **Step 1: Write the failing keyboard test.**

The point of the Tree is that arrow keys work across the whole explorer, not only inside the chapter list.

```ts
it("moves the roving focus across sections with the arrow keys", async () => {
  render(ExplorerView, { global: { plugins: [pinia] } });
  const book = screen.getByRole("treeitem", { name: /book/i });
  book.focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toHaveAccessibleName(/metadata/i);
});

it("still reorders chapters with Alt and the arrow keys", async () => {
  const project = useProjectStore();
  render(ExplorerView, { global: { plugins: [pinia] } });
  screen.getByRole("treeitem", { name: /1\. Chapter 1/ }).focus();
  await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
  expect(project.book!.chapters[1]!.id).toBe("chapter-1");
});
```

- [ ] **Step 2: Run them and watch them fail.**

```bash
pnpm test -- src/components/sidebar/__tests__/ExplorerView.test.ts
```

Expected: FAIL — nothing in the explorer has role `treeitem`.

- [ ] **Step 3: Write the wrapper.**

```ts
// src/components/ui/tree/index.ts
// Written by hand: shadcn-vue has no tree component. Do not overwrite with the CLI.
export { default as Tree } from "./Tree.vue";
export { default as TreeItem } from "./TreeItem.vue";
```

`Tree.vue` forwards its props to `TreeRoot` with `v-model:expanded` and `:get-key`/`:get-children`; `TreeItem.vue` forwards to Reka `TreeItem` and applies the `item` recipe plus `data-[selected]:bg-accent`.

- [ ] **Step 4: Shape the explorer as tree data.**

Build one `computed` producing three root nodes — Book, Chapters, Images — each with its children, and feed it to `Tree` with `getKey` returning the node id and `getChildren` returning `node.children`. The `collapsed` record is replaced by `v-model:expanded`. Keep `data-explorer-chapter`, `data-chapter-index`, `data-chapter-add`, `data-chapter-delete` and `data-explorer-section="chapters"` — `e2e/app.spec.ts` depends on all five.

- [ ] **Step 5: Keep drag reordering and Alt+↑/↓ on top of the roving focus.**

Reka's Tree owns Arrow, Home, End and typeahead. Alt+Arrow is ours: bind `@keydown.alt.up.prevent` and `@keydown.alt.down.prevent` on the chapter `TreeItem` and call the existing `move(index, direction)`. `draggable="true"` with the existing `dragstart`/`drop` handlers stays on the row element.

- [ ] **Step 6: Run the tests.**

```bash
pnpm test -- src/components/sidebar && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add -u && git add src/components/ui/tree src/components/sidebar
git commit -m "feat(ui): rebuild the explorer as an accessible tree"
```

---

## Task 10: Rebuild the search view

**Files:**

- Modify: `src/components/sidebar/SearchView.vue`, `src/components/sidebar/SearchResultItem.vue`
- Modify: `src/components/sidebar/SearchView.test.ts`, `src/components/sidebar/__tests__/SearchView.fix.test.ts`

**Interfaces:**

- Keeps the `select: [chapterId, from, to]` emit and every `useBookSearch` call unchanged.

- [ ] **Step 1: Write the failing test.**

```ts
it("names the search options and the replace toggle", async () => {
  render(SearchView, { global: { plugins: [pinia] } });
  await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "hero");
  await userEvent.click(screen.getByRole("button", { name: /show replace/i }));
  expect(screen.getByRole("textbox", { name: /replace/i })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: /match case/i }));
  expect(screen.getByRole("button", { name: /match case/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/sidebar/SearchView.test.ts
```

Expected: FAIL — the options are bare checkboxes labelled `Aa` and `.*`, and the replace toggle is a button labelled `⌄`.

- [ ] **Step 3: Rebuild the query row.**

`InputGroup` holding the search `Input` with `IconSearch` as the leading addon and a `ToggleGroup` of three `Toggle`s as the trailing addon: `IconLetterCase` for match case, `IconAbc` for whole word, `IconRegex` for the regular-expression mode. (`@tabler/icons-vue` has no whole-word glyph; `IconAbc` is the closest and the control carries an accessible name regardless.) The replace disclosure becomes a `Button` with `IconChevronDown` rotating on `aria-expanded`. Keep `data-search-input`, `data-replace-input`, `data-replace-toggle`, `data-replace-all`, `data-search-group`, `data-search-count`: `e2e/app.spec.ts` uses every one.

- [ ] **Step 4: Rebuild the result groups.**

Each group header becomes a `CollapsibleTrigger` with a `Badge` for the count; results become `Item`s with icon-only Replace and Hide buttons carrying `t("search.replaceOne")` and `t("search.hide")` as accessible names.

- [ ] **Step 5: Add the missing option labels to all three locales.**

Add `search.matchCase`, `search.wholeWordLabel`, `search.regexLabel`, `search.showReplace`. The existing `search.caseSensitive` (`"Aa"`) and `search.regex` (`".*"`) stay as the visible glyph text; the new keys are the accessible names.

- [ ] **Step 6: Run the tests.**

```bash
pnpm test -- src/components/sidebar && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/components/sidebar src/locales
git commit -m "feat(ui): rebuild book search on input and toggle groups"
```

---

## Task 11: Replace the language datalist with an autocomplete

**Files:**

- Create: `src/components/ui/autocomplete/{Autocomplete.vue,AutocompleteInput.vue,AutocompleteContent.vue,AutocompleteItem.vue,index.ts}`
- Modify: `src/components/metadata/LanguageCombobox.vue`
- Create: `src/components/metadata/__tests__/LanguageCombobox.test.ts`

**Interfaces:**

- Produces `@/components/ui/autocomplete`, built on Reka `Autocomplete*` and wearing the `combobox` component's classes.
- `LanguageCombobox` keeps `modelValue`, `error`, and the `update:modelValue` and `invalid` emits.

Reka `Autocomplete` is the right primitive, not `Combobox`: BCP 47 accepts any well-formed tag, so the list suggests rather than constrains. `AutocompleteRootProps.modelValue` is a free string.

- [ ] **Step 1: Write the failing test.**

```ts
it("suggests known tags but accepts any valid one", async () => {
  const { emitted } = render(LanguageCombobox, { props: { modelValue: "en" } });
  const input = screen.getByRole("combobox", { name: /language/i });
  await userEvent.clear(input);
  await userEvent.type(input, "pt-BR");
  // pt-BR is not in the suggestion list but is a valid BCP 47 tag.
  expect(emitted()["update:modelValue"]!.at(-1)).toEqual(["pt-BR"]);
  expect(emitted().invalid).toBeUndefined();
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/metadata/__tests__/LanguageCombobox.test.ts
```

Expected: FAIL — the current input has role `combobox` only by accident of `list=`, and carries no accessible name.

- [ ] **Step 3: Write the wrapper.**

Copy the class strings from `src/components/ui/combobox/*.vue` onto `AutocompleteRoot`, `AutocompleteInput`, `AutocompleteContent`, `AutocompleteItem` and `AutocompleteEmpty`. Head the `index.ts` with the same hand-written warning as `ui/tree`.

- [ ] **Step 4: Rebuild the field.**

Wrap in `Field` with a `Label`, keep the eight suggested tags as items, and surface the validation message through `FieldError` rather than a bare `<small>`.

- [ ] **Step 5: Run the tests.**

```bash
pnpm test -- src/components/metadata
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/components/ui/autocomplete src/components/metadata
git commit -m "feat(ui): suggest language tags with an autocomplete"
```

---

## Task 12: Rebuild the metadata form

**Files:**

- Modify: `src/components/metadata/MetadataForm.vue`, `src/components/metadata/ContributorsList.vue`, `src/components/metadata/CoverPicker.vue`
- Modify: `src/components/metadata/__tests__/MetadataForm.test.ts`, `src/components/metadata/__tests__/CoverPicker.test.ts`

**Interfaces:**

- All three keep their present props and emits. The cover blob cache in `MetadataForm.vue` — `cachedCover`, `releaseCover`, `coverPreview` — is moved verbatim, not rewritten.

- [ ] **Step 1: Write the failing test.**

```ts
it("labels every field and names the contributor controls", async () => {
  render(MetadataForm, { global: { plugins: [pinia] } });
  await userEvent.type(screen.getByRole("textbox", { name: /^title$/i }), "!");
  expect(useProjectStore().book!.metadata.title).toContain("!");
  expect(screen.getByRole("spinbutton", { name: /volume/i })).toBeDisabled();
  expect(screen.getAllByRole("button", { name: /move author up/i })[0]).toBeDisabled();
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/metadata/__tests__/MetadataForm.test.ts
```

Expected: FAIL — the series index is a bare `<input type=number>` with no name, and the reorder buttons are labelled `↑` and `↓`.

- [ ] **Step 3: Rebuild the form fields.**

`Field` + `Label` + `Input` for title and version, `Textarea` for the description, `NumberField` for the series index, `Separator` before the read-only block, and a definition list for UUID and dates. Every wrapping `<label>text<input></label>` becomes an explicit `Label for` / `Input id` pair — that association is what gives the accessible name.

- [ ] **Step 4: Rebuild the contributor rows.**

Icon buttons with `IconArrowUp`, `IconArrowDown`, `IconX` and `IconPlus`, each named through the new locale keys with the list label interpolated, so a screen reader hears "Move author up", not "up".

- [ ] **Step 5: Rebuild the cover picker.**

`Card` holding an `AspectRatio` of 1600/2560 for the thumbnail and an `Empty` for the drop zone. Keep `@dragover.prevent` and the existing `drop` handler untouched — the identity guard in it is load-bearing.

- [ ] **Step 6: Add the new keys to all three locales.**

`metadata.moveUp`, `metadata.moveDown`, `metadata.removeContributor`, `metadata.addContributor`, `metadata.seriesName`, `metadata.seriesIndex`.

- [ ] **Step 7: Run the tests.**

```bash
pnpm test -- src/components/metadata && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add src/components/metadata src/locales
git commit -m "feat(ui): rebuild the metadata form on labelled fields"
```

---

## Task 13: Rebuild the settings view and add the theme switcher

**Files:**

- Modify: `src/components/settings/SettingsView.vue`, `src/components/settings/__tests__/SettingsView.test.ts`, `e2e/settings.spec.ts`

**Interfaces:**

- Consumes `useTheme()` from Task 2.
- Keeps the `settings` and `actions` props unchanged.

`e2e/settings.spec.ts` is not the barrier and may be updated here; `e2e/layout.spec.ts` still may not.

- [ ] **Step 1: Write the failing test.**

```ts
it("switches the theme and persists the choice", async () => {
  render(SettingsView, { props: { settings, actions } });
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /theme/i }), "dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(actions.persist).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/settings
```

Expected: FAIL — there is no theme control.

- [ ] **Step 3: Rebuild the view.**

Three `Card`s — Appearance, Export, Maintenance. Appearance holds the language `Select` and the new theme `Select` with `IconSun`, `IconMoon`, `IconDeviceDesktop`. Export holds a `RadioGroup` for the preset and three `Switch`es. Maintenance holds the update check and the log folder button. `confirmDelete` becomes a `Switch`. Delete the `<style scoped>` block. Keep `data-setting="locale"`, `data-check-updates`, `data-open-logs` and `data-settings-view`.

- [ ] **Step 4: Update the settings e2e spec.**

The locale control is now a shadcn `Select`, not a native `<select>`, so `selectOption` no longer applies:

```ts
await page.getByRole("combobox", { name: /interface language/i }).click();
await page.getByRole("option", { name: "Русский" }).click();
```

- [ ] **Step 5: Add the theme keys to all three locales.**

`settings.theme`, `settings.themeLight`, `settings.themeDark`, `settings.themeSystem`.

- [ ] **Step 6: Run the tests.**

```bash
pnpm test -- src/components/settings && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/components/settings src/locales e2e/settings.spec.ts
git commit -m "feat(ui): rebuild settings and expose the theme switcher"
```

---

## Task 14: Rebuild the welcome and image views

**Files:**

- Modify: `src/views/WelcomeView.vue`, `src/views/__tests__/WelcomeView.test.ts`
- Modify: `src/components/editor/ImageView.vue`
- Create: `src/components/editor/__tests__/ImageView.test.ts`

**Interfaces:**

- `WelcomeView` keeps `data-action="new-project"`, `data-action="open-project"` and `data-action="recent-project"`: `e2e/app.spec.ts` and the barrier both open a project through them.
- `ImageView` keeps its single `path` prop and its use of `layout.center` to open a chapter.

`ImageView.vue` appears in neither the replacement map (§8) nor the untouched list (§12) of the spec — a gap found while writing this plan. It is a hand-rolled centre-pane view of the same kind as the metadata form, so it is migrated here rather than left as the one unconverted screen.

- [ ] **Step 1: Write the failing test.**

```ts
it("offers recovery sessions and recent files as named buttons", async () => {
  render(WelcomeView, { global: { provide: { [projectFilesKey]: files } } });
  await userEvent.click(screen.getByRole("button", { name: /new book/i }));
  expect(files.newBook).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /my-novel\.edb/ })).toBeVisible();
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/views/__tests__/WelcomeView.test.ts
```

Expected: FAIL — the recent-file buttons are truncated with `truncate`, so their accessible name is the full path but the test asserts a match that the current bare markup satisfies only by luck. Confirm the failure is real before proceeding.

- [ ] **Step 3: Rebuild on Card, Button and Item.**

A single `Card` holds the heading, the two primary `Button`s with `IconFilePlus` and `IconFolderOpen`, and the two lists rendered as `Item`s with `IconHistory` and `IconClock`. Replace the hand-written `rounded-md border px-4 py-2` classes with component variants.

- [ ] **Step 4: Write the failing image-view test.**

```ts
it("names the image and links to the chapters that use it", async () => {
  render(ImageView, { props: { path: "images/cover.png" }, global: { plugins: [pinia] } });
  expect(screen.getByRole("img", { name: "images/cover.png" })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: /chapter 1/i }));
  expect(useLayoutStore().center).toEqual({ kind: "chapter", id: "chapter-1" });
});
```

- [ ] **Step 5: Run it and watch it fail.**

```bash
pnpm test -- src/components/editor/__tests__/ImageView.test.ts
```

Expected: FAIL — the file does not exist yet; after creating it, the remaining failure is the usage list, which renders bare `<li><button>` rows.

- [ ] **Step 6: Rebuild the image view.**

`Card` holding an `AspectRatio` for the image, the path as the card title, a `Separator`, and the dimensions and byte size as `Badge`s. The "used in" list becomes `Item`s; the empty case becomes `Empty` with `IconPhotoOff`. Leave `bytesToBase64` and the `data:` URL alone — that is how the view reads bytes out of the in-memory book, and it is not a UI concern.

- [ ] **Step 7: Run the tests.**

```bash
pnpm test -- src/views src/components/editor && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add src/views src/components/editor
git commit -m "feat(ui): rebuild the welcome and image views on cards and items"
```

---

## Task 15: Rebuild the editor chrome

**Files:**

- Create: `src/components/ui/toolbar/{Toolbar.vue,ToolbarToggleGroup.vue,ToolbarToggleItem.vue,ToolbarSeparator.vue,index.ts}`
- Modify: `src/components/layout/AppToolbar.vue`, `src/components/layout/Breadcrumbs.vue`, `src/components/layout/StatusBadge.vue`
- Modify: `src/components/layout/__tests__/AppToolbar.test.ts`

**Interfaces:**

- Produces `@/components/ui/toolbar` over Reka `Toolbar*`, wearing the `toggle-group` classes.
- `AppToolbar` keeps its `export` emit; `StatusBadge` keeps `label` and `tone`; `Breadcrumbs` keeps its zero-prop signature.

- [ ] **Step 1: Write the failing test.**

`role="toolbar"` is a promise of arrow-key navigation. The current component makes the promise and does not keep it.

```ts
it("moves between modes with the arrow keys", async () => {
  render(AppToolbar, { global: { plugins: [pinia] } });
  screen.getByRole("radio", { name: /text/i }).focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(document.activeElement).toHaveAccessibleName(/split/i);
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/layout/__tests__/AppToolbar.test.ts
```

Expected: FAIL — focus does not move; the buttons are plain `<button>`s in a `div`.

- [ ] **Step 3: Write the wrapper and rebuild the toolbar.**

`ToolbarRoot` containing a `ToolbarToggleGroup` of three `ToolbarToggleItem`s, a `ToolbarSeparator`, and the export `Button` with `IconFileExport`. Each mode keeps its `Kbd` shortcut hint and its `data-mode` attribute. Keep `data-export-button`.

- [ ] **Step 4: Rebuild breadcrumbs and the status badge.**

`Breadcrumb` + `BreadcrumbList` + `BreadcrumbItem` + `BreadcrumbSeparator`, replacing the `›` string concatenation with real list structure — the label computation in the script stays, only its output shape changes from one string to segments. `StatusBadge` becomes `Badge` with `variant="secondary"` for `default` and `variant="destructive"` for `warning`.

- [ ] **Step 5: Run the tests.**

```bash
pnpm test -- src/components/layout && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/components/ui/toolbar src/components/layout
git commit -m "feat(ui): rebuild the editor toolbar, breadcrumbs and status badge"
```

---

## Task 16: Rebuild the warnings popover and the banners

**Files:**

- Modify: `src/components/editor/WarningsPopover.vue`, `src/views/EditorView.vue`, `src/App.vue`
- Modify: `src/components/editor/__tests__/WarningsPopover.test.ts`

**Interfaces:**

- `WarningsPopover` keeps the `chapterId` prop and the `select` emit with its `{ chapterId?, position? }` payload.

- [ ] **Step 1: Write the failing test.**

```ts
it("names the warning count and lists both groups", async () => {
  render(WarningsPopover, { props: { chapterId: "c1" }, global: { plugins: [pinia] } });
  await userEvent.click(screen.getByRole("button", { name: /2 warnings/i }));
  expect(await screen.findByRole("heading", { name: /current chapter/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: /^book$/i })).toBeVisible();
});
```

- [ ] **Step 2: Run it and watch it fail.**

```bash
pnpm test -- src/components/editor/__tests__/WarningsPopover.test.ts
```

Expected: FAIL — the trigger's accessible name is `⚠ 2`.

- [ ] **Step 3: Rebuild the popover.**

`Popover` + `PopoverTrigger` + `PopoverContent` with `side="top"` and `align="end"` to keep its present position, `IconAlertTriangle` plus a `Badge` in the trigger, and `ScrollArea` around the two sections so a long list scrolls at 20rem instead of stretching. Keep `data-warnings-trigger`.

- [ ] **Step 4: Replace the two banners.**

The open-problems strip in `EditorView.vue` and the update notice in `App.vue` both become `Alert`. The update notice keeps its fixed bottom-right position through utilities; the open-problems strip keeps `data-open-problems-banner`.

- [ ] **Step 5: Add the warning-count key to all three locales.**

`warnings.count` — "{count} warnings", pluralised through the existing `utils/plural.ts` helper.

- [ ] **Step 6: Run the tests.**

```bash
pnpm test -- src/components/editor src/__tests__ && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/components/editor src/views/EditorView.vue src/App.vue src/locales
git commit -m "feat(ui): rebuild the warnings popover and the banners"
```

---

## Task 17: Move notifications onto the Toast primitive

**Files:**

- Create: `src/components/ui/toast/{ToastProvider.vue,Toast.vue,ToastViewport.vue,index.ts}`
- Modify: `src/components/common/ToastStack.vue`, `src/components/common/UndoToast.vue`, `src/stores/notifications.ts`, `src/App.vue`
- Modify: `src/components/common/__tests__/UndoToast.test.ts`, `src/components/common/__tests__/ToastStack.test.ts`

**Interfaces:**

- Produces `@/components/ui/toast` over Reka `Toast*`, wearing the `alert` classes.
- `stores/notifications.ts` keeps `items`, `push`, `remove` and the undo callbacks; it loses the duration bookkeeping, which becomes the `ToastRoot` `duration` prop.

The progress bar with its glowing dot is ours and stays. Everything around it — the timer, the pause, the live region — moves to the primitive.

- [ ] **Step 1: Write the failing test.**

Section 4b of the base spec requires the countdown to pause when the window loses focus. Today that is hand-rolled with `useDocumentVisibility` and `useWindowFocus`; the primitive emits `pause` and `resume` from `ToastViewport`'s own `blur`/`focus` listeners.

```ts
it("pauses the countdown when the window loses focus", async () => {
  render(UndoToast, { props: { notification } });
  const bar = screen.getByTestId("undo-progress");
  expect(bar).not.toHaveAttribute("data-paused");
  window.dispatchEvent(new Event("blur"));
  await nextTick();
  expect(bar).toHaveAttribute("data-paused", "true");
});

it("keeps undo reachable by its accessible name", async () => {
  const { emitted } = render(UndoToast, { props: { notification } });
  await userEvent.click(screen.getByRole("button", { name: /undo/i }));
  expect(emitted().undo).toHaveLength(1);
});
```

- [ ] **Step 2: Run them and watch them fail.**

```bash
pnpm test -- src/components/common/__tests__/UndoToast.test.ts
```

Expected: FAIL — the progress element carries the class `is-paused`, not a data attribute, and nothing listens to window `blur` through the viewport.

- [ ] **Step 3: Write the wrapper and mount the provider.**

`ToastProvider` with `:duration="8000"` and `swipe-direction="right"` wraps the app in `App.vue`; `ToastViewport` renders the stack bottom-right and caps it at three.

- [ ] **Step 4: Rebuild UndoToast on ToastRoot.**

Keep the `<style scoped>` block's `undo-progress` keyframes and the glowing dot. Drive the pause from the primitive instead of VueUse:

```vue
<ToastRoot
  :duration="notification.duration ?? 8000"
  @pause="paused = true"
  @resume="paused = false"
  @update:open="!$event && emit('close')"
>
  <span data-testid="undo-progress" :data-paused="paused || undefined" class="undo-progress" />
</ToastRoot>
```

Remove the `useDocumentVisibility` and `useWindowFocus` imports. Give the exit animation the `data-state="closed"` selector it has never had — `.undo-toast--exit` is currently dead CSS.

- [ ] **Step 5: Confirm the hand-rolled pause is gone.**

```bash
grep -rn "useDocumentVisibility\|useWindowFocus" src
```

Expected: no matches.

- [ ] **Step 6: Run the tests.**

```bash
pnpm test -- src/components/common src/stores && pnpm test:e2e
```

Expected: PASS. `e2e/app.spec.ts` exercises the delete-undo path end to end and is the real check here.

- [ ] **Step 7: Commit.**

```bash
git add src/components/ui/toast src/components/common src/stores/notifications.ts src/App.vue
git commit -m "feat(ui): move undo notifications onto the Toast primitive"
```

---

## Task 18: Strip the stylesheet and audit the result

**Files:**

- Modify: `src/assets/style.css`
- Modify: every component still carrying a retired `data-*` hook
- Modify: `e2e/app.spec.ts`

**Interfaces:**

- Produces the end state the spec requires: `style.css` holds tokens and base only, and no `data-*` hook survives except the structural anchors from Task 3.

- [ ] **Step 1: Find every class rule with no remaining user.**

```bash
grep -oE '^\.[a-z-]+[a-z0-9_-]*' src/assets/style.css | sort -u | while read -r cls; do
  name="${cls#.}"
  count=$(grep -rl "$name" src --include=*.vue | wc -l)
  [ "$count" -eq 0 ] && echo "orphan: $cls"
done
```

- [ ] **Step 2: Delete the orphans and move the rest.**

Remove every orphaned rule. For any rule still in use, move it into its component as utilities. The explanatory comments — why `.editor-shell` uses `height` rather than `min-height`, why `.open-problems-banner` needs `flex: none`, why `.editor-single-pane__content` scrolls — travel with the geometry into the component templates. `.cm-*` rules and `.preview-pane` stay: they belong to CodeMirror and to a component this migration does not touch.

- [ ] **Step 3: Verify the stylesheet is down to tokens.**

```bash
grep -cE '^\.[a-z]' src/assets/style.css
```

Expected: `0`.

- [ ] **Step 4: Retire the interaction hooks from the e2e spec.**

Rewrite `e2e/app.spec.ts` onto roles, matching the unit tests: `getByRole("button", { name: /export/i })`, `getByRole("searchbox")`, and so on. The structural anchors stay. `e2e/layout.spec.ts` is still untouchable.

- [ ] **Step 5: Confirm no retired hook survives.**

```bash
grep -rhoE 'data-[a-z0-9-]+' src e2e | sort -u
```

Expected: only `data-shell`, `data-shell-body`, `data-sidebar`, `data-single-pane`, `data-single-pane-content`, `data-settings-view`, `data-resizable-split`, `data-pane`, `data-activity-bar`, `data-activity`, `data-width`, plus the `data-slot`/`data-variant`/`data-size`/`data-state` attributes the registry components emit.

- [ ] **Step 6: Audit icons and accessible names.**

```bash
grep -rnE '[▸▾★⚠⌄⌕⚙↔×↑↓]|📄' src --include=*.vue
```

Expected: no matches. Then walk every screen in both themes at 1280×800 and at 1280×500: welcome, editor in all three modes, explorer, search, metadata, image view, settings, export dialog, a delete confirmation and its undo toast.

- [ ] **Step 7: Run everything.**

```bash
pnpm check && pnpm test:e2e
```

Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add -A
git commit -m "refactor(ui): reduce the stylesheet to theme tokens"
```

---

## Verification

The migration is complete when all of the following hold:

- `pnpm check` and `pnpm test:e2e` pass.
- `e2e/layout.spec.ts` has not changed since Task 3.
- `src/assets/style.css` contains no class rules.
- No Vue file contains a text glyph used as an icon.
- Every interactive control is reachable by role and accessible name in all three locales.
- Switching between Text, Split and Preview does not recreate the preview iframe.
