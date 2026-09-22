<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from "vue";
import { useShortcuts } from "@/composables/use-shortcuts";
import { projectFilesKey } from "@/composables/use-project-files";
import { useLayoutStore, type LayoutMode } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";
import type { DiagnosticPosition } from "@/types/diagnostics";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import ResizableSplit from "@/components/layout/ResizableSplit.vue";
import StatusBadge from "@/components/layout/StatusBadge.vue";
import PreviewPane from "@/components/editor/PreviewPane.vue";
import SourceEditor from "@/components/editor/SourceEditor.vue";
import WarningsPopover from "@/components/editor/WarningsPopover.vue";
import ActivityBar from "@/components/sidebar/ActivityBar.vue";
import ExplorerView from "@/components/sidebar/ExplorerView.vue";
import MetadataForm from "@/components/metadata/MetadataForm.vue";
import CssEditor from "@/components/editor/CssEditor.vue";
import ImageView from "@/components/editor/ImageView.vue";
import {
  imageCursorPosition,
  useImageImport,
  type ImageFile,
} from "@/composables/use-image-import";
import { setCover } from "@/services/book/metadata";

const project = useProjectStore();
const files = inject(projectFilesKey, null);
const layout = useLayoutStore();
const shell = ref<HTMLElement>();
const sourceScroller = ref<HTMLElement | null>(null);
const sourceEditor = ref<{
  focusPosition: (position: DiagnosticPosition) => void;
  syncSource: (source: string, cursor: number) => void;
} | null>(null);
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
const imageImport = useImageImport({ pickFile: files?.pickImage });

async function importImage() {
  await imageImport.pickAndImport();
}

async function importImageAt(file: ImageFile, position: number) {
  const chapter = selectedChapter.value;
  if (!chapter) return;
  const source = chapter.source;
  const result = await imageImport.importFile(file, chapter.id, position);
  if (!result) return;
  const next = project.book?.chapters.find((item) => item.id === chapter.id)?.source;
  if (next) sourceEditor.value?.syncSource(next, imageCursorPosition(source, position));
}

async function importCover(file: ImageFile) {
  const result = await imageImport.importFile(file);
  if (result && project.book) project.applyMutation(setCover(project.book, result.path));
}

async function pickCover() {
  const generation = project.bookGeneration;
  const bookId = project.book?.metadata.id;
  const file = await files?.pickImage();
  if (file && project.bookGeneration === generation && project.book?.metadata.id === bookId)
    await importCover(file);
}

function setMode(mode: LayoutMode) {
  if (!canUseModes.value) return;
  layout.mode = mode;
  void layout.persist();
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
  newBook: files ? () => void files.newBook() : undefined,
  open: files ? () => void files.open() : undefined,
  save: files ? () => void files.save() : undefined,
  saveAs: files ? () => void files.saveAs() : undefined,
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
          <ActivityBar :active="activeActivity" @select="selectActivity" />
        </template>
        <template #sidebar>
          <div class="editor-sidebar__content">
            <ExplorerView v-if="layout.activeView === 'explorer'" @import="importImage" />
            <div v-else class="editor-placeholder">Поиск по книге</div>
          </div>
        </template>
        <template #single>
          <div class="editor-single-pane">
            <Breadcrumbs />
            <MetadataForm
              v-if="layout.center.kind === 'metadata'"
              :on-pick-cover="pickCover"
              :on-import-cover="importCover"
            />
            <ImageView v-else-if="layout.center.kind === 'image'" :path="layout.center.path" />
            <div v-else class="editor-placeholder">
              {{ layout.center.kind === "settings" ? "Settings" : "Select a chapter" }}
            </div>
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
              :import-image="importImageAt"
            />
            <CssEditor v-else-if="layout.center.kind === 'css'" />
            <div v-else class="editor-placeholder">Выберите главу</div>
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
