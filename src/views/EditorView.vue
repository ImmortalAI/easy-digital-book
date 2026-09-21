<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useShortcuts } from "@/composables/use-shortcuts";
import { useLayoutStore, type LayoutMode } from "@/stores/layout";
import { useProjectStore } from "@/stores/project";
import { extractTitle } from "@/services/book/extract-title";
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
const selectedChapterId = computed(() => {
  const selected = layout.center.kind === "chapter" ? layout.center.id : "";
  return project.book?.chapters.some((chapter) => chapter.id === selected)
    ? selected
    : (project.book?.chapters[0]?.id ?? "");
});
const selectedChapter = computed(() =>
  project.book?.chapters.find((chapter) => chapter.id === selectedChapterId.value),
);
const canUseModes = computed(() => ["chapter", "css"].includes(layout.center.kind));
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

function findSourceScroller() {
  sourceScroller.value = shell.value?.querySelector<HTMLElement>(".cm-scroller") ?? null;
}

useShortcuts({
  toggleSidebar: () => layout.toggleSidebar(),
  explorer: () => layout.setSidebarVisible(true),
  searchBook: () => layout.setSidebarVisible(true),
  textMode: () => setMode("text"),
  splitMode: () => setMode("split"),
  previewMode: () => setMode("preview"),
});

watch(
  () => [project.bookGeneration, selectedChapterId.value] as const,
  async () => {
    if (layout.center.kind === "chapter" && layout.center.id !== selectedChapterId.value) {
      layout.center = { kind: "chapter", id: selectedChapterId.value };
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
      <ResizableSplit>
        <template #sidebar>
          <div class="editor-sidebar__activity">
            <button type="button" aria-label="Проводник" @click="layout.setSidebarVisible(true)">
              📄
            </button>
            <button type="button" aria-label="Поиск" @click="layout.setSidebarVisible(true)">
              ⌕
            </button>
          </div>
          <div class="editor-sidebar__content">
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
          </div>
        </template>
        <template #source>
          <div class="editor-pane">
            <Breadcrumbs />
            <SourceEditor
              v-if="layout.center.kind === 'chapter' && selectedChapterId"
              :chapter-id="selectedChapterId"
            />
            <div v-else class="editor-placeholder">
              {{ layout.center.kind === "css" ? "custom.css" : "Выберите главу" }}
            </div>
            <div class="editor-pane__status">
              <WarningsPopover :chapter-id="selectedChapterId" />
              <StatusBadge :label="`${wordCount} слов · ${characterCount} симв.`" />
            </div>
          </div>
        </template>
        <template #preview>
          <PreviewPane
            v-if="selectedChapterId"
            :chapter-id="selectedChapterId"
            :source-scroller="sourceScroller"
          />
        </template>
      </ResizableSplit>
    </div>
  </main>
</template>
