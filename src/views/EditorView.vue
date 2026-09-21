<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useShortcuts } from "@/composables/use-shortcuts";
import { useLayoutStore, type LayoutMode } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";
import { extractTitle } from "@/services/book/extract-title";
import type { DiagnosticPosition } from "@/types/diagnostics";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import ResizableSplit from "@/components/layout/ResizableSplit.vue";
import StatusBadge from "@/components/layout/StatusBadge.vue";
import PreviewPane from "@/components/editor/PreviewPane.vue";
import SourceEditor from "@/components/editor/SourceEditor.vue";
import WarningsPopover from "@/components/editor/WarningsPopover.vue";

const project = useProjectStore();
const layout = useLayoutStore();
const shell = ref<HTMLElement>();
const sourceScroller = ref<HTMLElement | null>(null);
const sourceEditor = ref<{ focusPosition: (position: DiagnosticPosition) => void } | null>(null);
const pendingFocusPosition = ref<DiagnosticPosition | null>(null);
const focusRequest = ref(0);

function hasChapter(id: string): boolean {
  return Boolean(project.book?.chapters.some((chapter) => chapter.id === id));
}

const firstChapterId = computed(() => project.book?.chapters[0]?.id ?? "");
const selectedChapterId = computed(() => {
  const selected = layout.center.kind === "chapter" ? layout.center.id : "";
  return hasChapter(selected) ? selected : "";
});
const lastChapterId = ref("");
const previewChapterId = computed(() =>
  hasChapter(lastChapterId.value) ? lastChapterId.value : firstChapterId.value,
);
const selectedChapter = computed(() =>
  project.book?.chapters.find((chapter) => chapter.id === selectedChapterId.value),
);
const canUseModes = computed(() => ["chapter", "css"].includes(layout.center.kind));
const singlePane = computed(() => ["metadata", "image", "settings"].includes(layout.center.kind));
const activeActivity = computed(() =>
  layout.center.kind === "settings" ? "settings" : layout.activeView,
);
const wordCount = computed(
  () => selectedChapter.value?.source.trim().split(/\s+/).filter(Boolean).length ?? 0,
);
const characterCount = computed(() => selectedChapter.value?.source.length ?? 0);

function setMode(mode: LayoutMode) {
  if (!canUseModes.value) return;
  layout.mode = mode;
  void layout.persist();
}

function selectChapter(id: string) {
  layout.center = { kind: "chapter", id };
}

function persistLayout() {
  void layout.persist();
}

function showSidebarView(view: "explorer" | "search") {
  layout.activeView = view;
  layout.setSidebarVisible(true);
  persistLayout();
}

function selectActivity(view: "explorer" | "search" | "settings") {
  if (view === "settings") {
    layout.center = { kind: "settings" };
    layout.setSidebarVisible(false);
    persistLayout();
    return;
  }
  if (layout.activeView === view && layout.sidebarVisible) {
    layout.setSidebarVisible(false);
  } else {
    layout.activeView = view;
    layout.setSidebarVisible(true);
  }
  persistLayout();
}

async function selectWarning(item: { chapterId?: string; position?: DiagnosticPosition }) {
  const chapterId = item.chapterId ?? selectedChapterId.value;
  if (!chapterId || !hasChapter(chapterId)) return;
  layout.center = { kind: "chapter", id: chapterId };
  pendingFocusPosition.value = item.position ?? null;
  if (!item.position) return;
  focusRequest.value++;
  await nextTick();
  sourceEditor.value?.focusPosition(item.position);
}

function findSourceScroller() {
  sourceScroller.value = shell.value?.querySelector<HTMLElement>(".cm-scroller") ?? null;
}

useShortcuts({
  toggleSidebar: () => {
    layout.toggleSidebar();
    persistLayout();
  },
  explorer: () => showSidebarView("explorer"),
  searchBook: () => showSidebarView("search"),
  textMode: () => setMode("text"),
  splitMode: () => setMode("split"),
  previewMode: () => setMode("preview"),
});

watch(
  () =>
    [
      project.bookGeneration,
      project.book?.chapters.map((chapter) => chapter.id).join("\u0000"),
      layout.center.kind,
      layout.center.kind === "chapter" ? layout.center.id : "",
    ] as const,
  async () => {
    if (layout.center.kind === "chapter") {
      if (hasChapter(layout.center.id)) lastChapterId.value = layout.center.id;
      else if (firstChapterId.value) {
        layout.center = { kind: "chapter", id: firstChapterId.value };
        return;
      }
    }
    await nextTick();
    findSourceScroller();
  },
  { immediate: true },
);

onMounted(findSourceScroller);
</script>

<template>
  <main ref="shell" class="editor-shell">
    <header class="editor-shell__header">
      <div class="editor-shell__title">
        {{ project.filePath ?? "Безымянная книга" }}<span v-if="project.dirty"> •</span>
      </div>
      <AppToolbar>
        <button class="editor-shell__export" type="button">Экспорт</button>
      </AppToolbar>
    </header>
    <div class="editor-shell__body">
      <ResizableSplit :single-pane="singlePane">
        <template #activity>
          <div class="editor-activity">
            <button
              data-activity="explorer"
              :class="{ 'is-active': activeActivity === 'explorer' }"
              type="button"
              aria-label="Проводник"
              :aria-pressed="activeActivity === 'explorer'"
              @click="selectActivity('explorer')"
            >
              📄
            </button>
            <button
              data-activity="search"
              :class="{ 'is-active': activeActivity === 'search' }"
              type="button"
              aria-label="Поиск"
              :aria-pressed="activeActivity === 'search'"
              @click="selectActivity('search')"
            >
              ⌕
            </button>
            <button
              data-activity="settings"
              class="editor-activity__settings"
              :class="{ 'is-active': activeActivity === 'settings' }"
              type="button"
              aria-label="Настройки"
              :aria-pressed="activeActivity === 'settings'"
              @click="selectActivity('settings')"
            >
              ⚙
            </button>
          </div>
        </template>
        <template #sidebar>
          <div class="editor-sidebar__content">
            <template v-if="layout.activeView === 'explorer'">
              <strong>ПРОВОДНИК</strong>
              <section>
                <div class="editor-sidebar__section-title">ГЛАВЫ</div>
                <button
                  v-for="(chapter, index) in project.book?.chapters"
                  :key="chapter.id"
                  class="editor-sidebar__chapter"
                  :class="{ 'is-active': chapter.id === selectedChapterId }"
                  type="button"
                  @click="selectChapter(chapter.id)"
                >
                  {{ index + 1 }}. {{ extractTitle(chapter.source) || `Глава ${index + 1}` }}
                </button>
              </section>
            </template>
            <div v-else class="editor-placeholder">Поиск по книге</div>
          </div>
        </template>
        <template #single>
          <div class="editor-single-pane">
            <Breadcrumbs />
            <div class="editor-placeholder">Этот раздел будет доступен позже</div>
          </div>
        </template>
        <template #source>
          <div class="editor-pane">
            <Breadcrumbs />
            <SourceEditor
              ref="sourceEditor"
              v-if="layout.center.kind === 'chapter' && selectedChapterId"
              :chapter-id="selectedChapterId"
              :focus-position="pendingFocusPosition"
              :focus-request="focusRequest"
            />
            <div v-else class="editor-placeholder">
              {{ layout.center.kind === "css" ? "custom.css" : "Выберите главу" }}
            </div>
            <div class="editor-pane__status">
              <WarningsPopover
                v-if="!singlePane"
                :chapter-id="selectedChapterId || previewChapterId"
                @select="selectWarning"
              />
              <StatusBadge :label="`${wordCount} слов · ${characterCount} симв.`" />
            </div>
          </div>
        </template>
        <template #preview>
          <PreviewPane
            v-if="previewChapterId"
            :chapter-id="previewChapterId"
            :source-scroller="sourceScroller"
          />
        </template>
      </ResizableSplit>
    </div>
  </main>
</template>
