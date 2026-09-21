<script setup lang="ts">
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { openSearchPanel, searchKeymap } from "@codemirror/search";
import { keymap, EditorView } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { setDiagnostics } from "@codemirror/lint";
import {
  createChapterEditor,
  chapterEditorStates,
  insertFootnote,
  toggleMarkup,
} from "./editor-commands";
import { novlangLanguage, diagnosticRange } from "./novlang-language";
import { useNovlangParse } from "@/composables/use-novlang-parse";
import { useProjectStore } from "@/stores/project";

const props = defineProps<{ chapterId: string }>();
const host = ref<HTMLElement>();
const project = useProjectStore();
const parser = useNovlangParse(props.chapterId);
let view: EditorView | undefined;

function updateDiagnostics() {
  if (!view || !parser.result.value) return;
  const source = view.state.doc.toString();
  const items = parser.result.value.diagnostics
    .filter((item) => item.position)
    .map((item) => {
      const range = diagnosticRange(source, item.position!);
      return {
        ...range,
        severity: item.severity,
        message: item.message,
        source: "NovLang",
      };
    });
  view.dispatch(setDiagnostics(view.state, items));
}

onMounted(() => {
  const chapter = project.book?.chapters.find((item) => item.id === props.chapterId);
  if (!chapter || !host.value) return;
  const language = project.book?.metadata.language ?? "en";
  const state = createChapterEditor(props.chapterId, chapter.source, [
    novlangLanguage,
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: "true", lang: language }),
    keymap.of([
      { key: "Mod-b", run: (editor) => (editor.dispatch(toggleMarkup(editor.state, "**")), true) },
      { key: "Mod-i", run: (editor) => (editor.dispatch(toggleMarkup(editor.state, "*")), true) },
      { key: "Mod-Alt-f", run: (editor) => (editor.dispatch(insertFootnote(editor.state)), true) },
      { key: "Mod-f", run: openSearchPanel },
      ...searchKeymap,
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      chapterEditorStates.set(props.chapterId, update.state);
      parser.updateSource(update.state.doc.toString());
    }),
  ]);
  view = new EditorView({ state, parent: host.value });
  updateDiagnostics();
});

watch(parser.result, updateDiagnostics);

onBeforeUnmount(() => {
  view?.destroy();
  view = undefined;
});
</script>

<template>
  <div ref="host" class="source-editor" />
</template>
