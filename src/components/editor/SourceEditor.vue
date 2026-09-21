<script setup lang="ts">
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { openSearchPanel, searchKeymap } from "@codemirror/search";
import { setDiagnostics } from "@codemirror/lint";
import { syntaxHighlighting } from "@codemirror/language";
import { keymap, EditorView } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, toRef, watch } from "vue";
import {
  chapterEditorStates,
  createChapterEditor,
  insertFootnote,
  reconfigureChapterEditor,
  resetChapterEditors,
  toggleMarkup,
} from "./editor-commands";
import { diagnosticRange, novlangHighlightStyle, novlangLanguage } from "./novlang-language";
import { chapterParseResults, useNovlangParse } from "@/composables/use-novlang-parse";
import { useProjectStore } from "@/stores/project";

const props = defineProps<{ chapterId: string }>();
const host = ref<HTMLElement>();
const project = useProjectStore();
const parser = useNovlangParse(toRef(props, "chapterId"));
let view: EditorView | undefined;

const editorTheme = EditorView.theme({
  "&": { fontFamily: "system-ui, sans-serif", fontSize: "1rem" },
  ".cm-content": {
    fontFamily: "inherit",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    padding: "1rem",
  },
  ".cm-line": { padding: "0" },
});

function editorExtensions(chapterId: string) {
  const language = project.book?.metadata.language ?? "en";
  return [
    novlangLanguage,
    syntaxHighlighting(novlangHighlightStyle),
    editorTheme,
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: "true", lang: language }),
    keymap.of([
      {
        key: "Mod-b",
        run: (editor: EditorView) => (editor.dispatch(toggleMarkup(editor.state, "**")), true),
      },
      {
        key: "Mod-i",
        run: (editor: EditorView) => (editor.dispatch(toggleMarkup(editor.state, "*")), true),
      },
      {
        key: "Mod-Alt-f",
        run: (editor: EditorView) => (editor.dispatch(insertFootnote(editor.state)), true),
      },
      { key: "Mod-f", run: openSearchPanel },
      ...searchKeymap,
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      chapterEditorStates.set(chapterId, update.state);
      parser.updateSource(update.state.doc.toString());
    }),
  ];
}

function updateDiagnostics() {
  if (!view) return;
  const parsed = chapterParseResults.get(props.chapterId);
  if (!parsed) return;
  const source = view.state.doc.toString();
  const items = parsed.diagnostics
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

function mountEditor(chapterId: string) {
  const chapter = project.book?.chapters.find((item) => item.id === chapterId);
  if (!chapter || !host.value) return;
  const state = createChapterEditor(chapterId, chapter.source, editorExtensions(chapterId));
  view = new EditorView({ state, parent: host.value });
  const effect = reconfigureChapterEditor(chapterId, editorExtensions(chapterId));
  if (effect) view.dispatch({ effects: effect });
  updateDiagnostics();
}

function remountEditor(chapterId: string) {
  view?.destroy();
  view = undefined;
  mountEditor(chapterId);
}

onMounted(() => mountEditor(props.chapterId));

watch(() => props.chapterId, remountEditor);

watch(
  () => project.bookGeneration,
  () => {
    resetChapterEditors();
    remountEditor(props.chapterId);
  },
);

watch(() => [props.chapterId, chapterParseResults.get(props.chapterId)], updateDiagnostics);

watch(
  () => project.book?.metadata.language,
  () => {
    if (!view) return;
    const effect = reconfigureChapterEditor(props.chapterId, editorExtensions(props.chapterId));
    if (effect) view.dispatch({ effects: effect });
  },
);

onBeforeUnmount(() => {
  parser.dispose();
  view?.destroy();
  view = undefined;
});
</script>

<template>
  <div ref="host" class="source-editor" />
</template>
