<script setup lang="ts">
import { computed, ref } from "vue";
import { useProjectStore } from "@/stores/project";
import { useLayoutStore } from "@/stores/layout";
import { addChapter, moveChapter } from "@/services/book/chapters";
import { setCover, setCustomCss } from "@/services/book/metadata";
import { collectImageUsage, collectUsedImagePaths } from "@/services/checks/image-usage";
import { customCssTemplate } from "@/assets/epub/custom.css";
import { uniqueRandomId } from "@/utils/random-id";
import { extractTitle } from "@/services/book/extract-title";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import ExplorerSection from "./ExplorerSection.vue";
import ChapterItem from "./ChapterItem.vue";
import ImageItem from "./ImageItem.vue";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import { useSettingsStore } from "@/stores/settings";
import { useBookSearch } from "@/composables/use-book-search";
import { useDiagnosticsStore } from "@/stores/diagnostics";
import { checkBook } from "@/services/checks/book-checks";
import { syncChapterEditorText } from "@/components/editor/editor-commands";
const project = useProjectStore();
const { t } = useSafeI18n();
const layout = useLayoutStore();
const settings = useSettingsStore();
const diagnostics = useDiagnosticsStore();
const search = useBookSearch();
type DeleteTarget = { kind: "chapter" | "image"; id: string } | { kind: "unused"; paths: string[] };
const pendingDelete = ref<DeleteTarget | null>(null);
const collapsed = ref<Record<string, boolean>>({});
const draggedChapter = ref<number | null>(null);
const book = computed(() => project.book);
const usage = computed(() =>
  book.value ? collectImageUsage(book.value) : new Map<string, string[]>(),
);
/** Chapter references alone are not usage: the cover and custom.css count too. */
const usedImages = computed(() =>
  book.value ? collectUsedImagePaths(book.value) : new Set<string>(),
);
const warningCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const [chapterId, items] of diagnostics.parse) counts.set(chapterId, items.length);
  const warnings = [
    ...diagnostics.book,
    ...diagnostics.read,
    ...(book.value ? checkBook(book.value) : []),
  ];
  for (const warning of warnings)
    if (warning.chapterId) counts.set(warning.chapterId, (counts.get(warning.chapterId) ?? 0) + 1);
  return counts;
});
function unusedResourcePaths(): string[] {
  return book.value
    ? [...book.value.resources.keys()].filter((path) => !usedImages.value.has(path))
    : [];
}
function chapterDisplayName(id: string): string {
  const index = book.value?.chapters.findIndex((chapter) => chapter.id === id) ?? -1;
  const chapter = index >= 0 ? book.value?.chapters[index] : undefined;
  return (
    (chapter && extractTitle(chapter.source)) ||
    t("chapters.fallback", "Chapter {number}").replace("{number}", String(index + 1))
  );
}
function imageUsageDetails(path: string): string {
  const chapters = usage.value.get(path) ?? [];
  if (chapters.length)
    return `${t("images.usedIn", "Used in")}: ${chapters.map(chapterDisplayName).join(", ")}`;
  if (book.value?.metadata.cover === path) return t("images.usedAsCover", "Used as the cover");
  if (usedImages.value.has(path)) return t("images.usedInStyles", "Used in custom.css");
  return t("images.unused", "not used");
}
const deleteTitle = computed(() => {
  const target = pendingDelete.value;
  if (target?.kind === "unused") return t("delete.unusedTitle", "Delete unused images");
  if (target?.kind === "image")
    return `${t("delete.imageTitle", "Delete image")} “${target.id.replace(/^images\//, "") ?? ""}”`;
  return `${t("delete.chapterTitle", "Delete chapter")} “${target ? chapterDisplayName(target.id) : ""}”`;
});
const deleteMessage = computed(() =>
  pendingDelete.value?.kind === "unused"
    ? t("delete.unusedMessage", "These unused images will be removed from the project.")
    : pendingDelete.value?.kind === "image"
      ? t("delete.imageMessage", "This image will be removed from the project.")
      : t("delete.chapterMessage", "This chapter will be removed from the book."),
);
const deleteDetails = computed(() => {
  const target = pendingDelete.value;
  if (target?.kind === "unused")
    return target.paths.map((path) => path.replace(/^images\//, "")).join(", ");
  if (target?.kind === "image") {
    return imageUsageDetails(target.id);
  }
  const chapter = book.value?.chapters.find((item) => item.id === target?.id);
  const words = chapter?.source.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return `${t("delete.words", "Words")}: ${words}`;
});
function toggle(name: string) {
  collapsed.value[name] = !collapsed.value[name];
}
function selectChapter(id: string) {
  layout.center = { kind: "chapter", id };
}
function add(index = book.value?.chapters.length ?? 0) {
  if (book.value) {
    const result = addChapter(
      book.value,
      {
        newId: () => uniqueRandomId(book.value!.chapters.map((chapter) => chapter.id)),
        locale: book.value.metadata.language,
      },
      index,
    );
    project.applyMutation(result);
    selectChapter(
      result.book.chapters[index]?.id ?? result.book.chapters[result.book.chapters.length - 1]!.id,
    );
  }
}
function move(index: number, direction: -1 | 1) {
  if (book.value) {
    const mutation = moveChapter(book.value, index, index + direction);
    if (mutation.book !== book.value) project.applyMutation(mutation);
  }
}
function navigate(index: number, direction: -1 | 1) {
  const target = book.value?.chapters[index + direction];
  if (target) selectChapter(target.id);
}
function removeChapterAt(id: string) {
  if (!book.value) return;
  if (!settings.confirmDelete) {
    search.deleteChapter(id);
    return;
  }
  pendingDelete.value = { kind: "chapter", id };
}
function confirmDelete(value: { askAgain: boolean }) {
  const target = pendingDelete.value;
  if (target?.kind === "chapter" && target.id) search.deleteChapter(target.id);
  if (target?.kind === "image" && target.id) search.deleteResource(target.id);
  if (target?.kind === "unused") for (const path of target.paths) search.deleteResource(path);
  pendingDelete.value = null;
  if (!value.askAgain) {
    settings.confirmDelete = false;
    void settings.persist();
  }
}
function requestDelete(target: { kind: "chapter" | "image" | "unused"; id?: string }) {
  if (!settings.confirmDelete) {
    if (target.kind === "chapter" && target.id) search.deleteChapter(target.id);
    if (target.kind === "image" && target.id) search.deleteResource(target.id);
    if (target.kind === "unused")
      for (const path of unusedResourcePaths()) search.deleteResource(path);
    return;
  }
  pendingDelete.value =
    target.kind === "unused"
      ? { kind: "unused", paths: unusedResourcePaths() }
      : { kind: target.kind, id: target.id! };
}
/**
 * The single dispatcher for every row's context menu. Each row's ContextMenu
 * owns its own trigger and content now (no more shared coordinate state), so
 * the target comes straight from the item that invoked this — the v-for scope
 * that owns the menu the action was picked from.
 */
function selectContextAction(value: string, target: { kind: "chapter" | "image"; id: string }) {
  if (target.kind === "chapter" && value === "new-after") {
    const index = book.value?.chapters.findIndex((chapter) => chapter.id === target.id) ?? -1;
    if (index >= 0) add(index + 1);
  }
  if (target.kind === "chapter" && value === "delete")
    requestDelete({ kind: "chapter", id: target.id });
  if (target.kind === "image" && value === "cover" && book.value)
    project.applyMutation(setCover(book.value, target.id));
  if (target.kind === "image" && value === "insert") insertImage(target.id);
  if (target.kind === "image" && value === "search") {
    layout.activeView = "search";
    layout.setSidebarVisible(true);
  }
  if (target.kind === "image" && value === "delete")
    requestDelete({ kind: "image", id: target.id });
}
function insertImage(path: string) {
  // layout.center starts as { kind: "chapter", id: "" }, so matching on the id
  // alone silently finds nothing until a chapter has been opened.
  const selected = layout.center.kind === "chapter" ? layout.center.id : "";
  const chapter =
    book.value?.chapters.find((item) => item.id === selected) ?? book.value?.chapters[0];
  if (!chapter) return;
  const source = `${chapter.source}\n\n![](${path})`;
  project.updateChapterSource(chapter.id, source);
  syncChapterEditorText(chapter.id, source);
  layout.center = { kind: "chapter", id: chapter.id };
}
function openCss() {
  if (!book.value) return;
  if (book.value.customCss === null)
    project.applyMutation(setCustomCss(book.value, customCssTemplate));
  layout.center = { kind: "css" };
}
function startDrag(index: number) {
  draggedChapter.value = index;
}
function dropChapter(index: number) {
  if (draggedChapter.value !== null && draggedChapter.value !== index && book.value)
    project.applyMutation(moveChapter(book.value, draggedChapter.value, index));
  draggedChapter.value = null;
}
function requestImport() {
  emit("import");
}
/**
 * Forwards the raw contextmenu event alongside the row's own ContextMenu —
 * consumers outside this component (e.g. a later task) still get to observe
 * the right click. This must not interfere with the menu opening: it never
 * calls preventDefault, so ImageItem's ContextMenuTrigger still does.
 */
function imageContextMenu(path: string, event: MouseEvent) {
  emit("image-context-menu", path, event);
}
const emit = defineEmits<{ import: []; "image-context-menu": [path: string, event: MouseEvent] }>();
</script>
<template>
  <div v-if="book" class="explorer-view">
    <h2>{{ t("explorer.title", "Explorer") }}</h2>
    <ExplorerSection
      :title="t('explorer.book', 'Book')"
      :collapsed="collapsed.book"
      @toggle="toggle('book')"
      ><button type="button" @click="layout.center = { kind: 'metadata' }">
        {{ t("explorer.metadata", "Metadata") }}</button
      ><button type="button" @click="openCss">
        {{
          book.customCss === null ? t("explorer.createCss", "custom.css (create)") : "custom.css"
        }}
      </button></ExplorerSection
    >
    <ExplorerSection
      data-explorer-section="chapters"
      :title="t('explorer.chapters', 'Chapters')"
      :count="book.chapters.length"
      :collapsed="collapsed.chapters"
      @toggle="toggle('chapters')"
      ><template #action
        ><button type="button" data-chapter-add @click.stop="add()">+</button></template
      ><ChapterItem
        v-for="(chapter, index) in book.chapters"
        :key="chapter.id"
        :chapter="chapter"
        :index="index"
        :active="layout.center.kind === 'chapter' && layout.center.id === chapter.id"
        :warning-count="warningCounts.get(chapter.id) ?? 0"
        :fallback-title="
          t('chapters.fallback', 'Chapter {number}').replace('{number}', String(index + 1))
        "
        @select="selectChapter(chapter.id)"
        @move="move(index, $event)"
        @navigate="navigate(index, $event)"
        @remove="removeChapterAt(chapter.id)"
        @context-action="selectContextAction($event, { kind: 'chapter', id: chapter.id })"
        @new-after="add(index + 1)"
        @drag-start="startDrag(index)"
        @drop="dropChapter(index)"
    /></ExplorerSection>
    <ExplorerSection
      :title="t('explorer.images', 'Images')"
      :count="book.resources.size"
      :collapsed="collapsed.images"
      @toggle="toggle('images')"
      ><template #action
        ><button type="button" @click.stop="requestImport">+</button
        ><button type="button" @click.stop="requestDelete({ kind: 'unused' })">×</button></template
      ><ImageItem
        v-for="path in [...book.resources.keys()]"
        :key="path"
        :path="path"
        :cover="book.metadata.cover === path"
        :unused="!usedImages.has(path)"
        @select="layout.center = { kind: 'image', path }"
        @contextmenu="imageContextMenu(path, $event)"
        @context-action="selectContextAction($event, { kind: 'image', id: path })"
    /></ExplorerSection>
    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="deleteTitle"
      :message="deleteMessage"
      :details="deleteDetails"
      :ask-again-label="t('common.doNotAskAgain', 'Do not ask again')"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
