<script setup lang="ts">
import { computed, ref } from "vue";
import { useProjectStore } from "@/stores/project";
import { useLayoutStore } from "@/stores/layout";
import { addChapter, moveChapter, removeChapter } from "@/services/book/chapters";
import { setCover } from "@/services/book/metadata";
import { setCustomCss } from "@/services/book/metadata";
import { collectImageUsage } from "@/services/checks/image-usage";
import { customCssTemplate } from "@/assets/epub/custom.css";
import { uniqueRandomId } from "@/utils/random-id";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import ExplorerSection from "./ExplorerSection.vue";
import ChapterItem from "./ChapterItem.vue";
import ImageItem from "./ImageItem.vue";
const project = useProjectStore();
const { t } = useSafeI18n();
const layout = useLayoutStore();
const collapsed = ref<Record<string, boolean>>({});
const draggedChapter = ref<number | null>(null);
const book = computed(() => project.book);
const usage = computed(() =>
  book.value ? collectImageUsage(book.value) : new Map<string, string[]>(),
);
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
  if (book.value) project.applyMutation(moveChapter(book.value, index, index + direction));
}
function removeChapterAt(id: string) {
  if (book.value) project.applyMutation(removeChapter(book.value, id));
}
function openCss() {
  if (!book.value) return;
  if (book.value.customCss === null)
    project.applyMutation(setCustomCss(book.value, customCssTemplate));
  layout.center = { kind: "css" };
}
function setImageCover(path: string) {
  if (book.value) project.applyMutation(setCover(book.value, path));
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
const emit = defineEmits<{ import: [] }>();
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
      :title="t('explorer.chapters', 'Chapters')"
      :count="book.chapters.length"
      :collapsed="collapsed.chapters"
      @toggle="toggle('chapters')"
      ><template #action><button type="button" @click.stop="add()">+</button></template
      ><ChapterItem
        v-for="(chapter, index) in book.chapters"
        :key="chapter.id"
        :chapter="chapter"
        :index="index"
        :active="layout.center.kind === 'chapter' && layout.center.id === chapter.id"
        :fallback-title="
          t('chapters.fallback', 'Chapter {number}').replace('{number}', String(index + 1))
        "
        @select="selectChapter(chapter.id)"
        @move="move(index, $event)"
        @remove="removeChapterAt(chapter.id)"
        @new-after="add(index + 1)"
        @drag-start="startDrag(index)"
        @drop="dropChapter(index)"
    /></ExplorerSection>
    <ExplorerSection
      :title="t('explorer.images', 'Images')"
      :count="book.resources.size"
      :collapsed="collapsed.images"
      @toggle="toggle('images')"
      ><template #action><button type="button" @click.stop="requestImport">+</button></template
      ><ImageItem
        v-for="path in [...book.resources.keys()]"
        :key="path"
        :path="path"
        :cover="book.metadata.cover === path"
        :unused="!usage.has(path)"
        @select="layout.center = { kind: 'image', path }"
        @contextmenu="setImageCover(path)"
    /></ExplorerSection>
  </div>
</template>
