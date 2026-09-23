<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { customCssTemplate } from "@/assets/epub/custom.css";
import { useProjectStore } from "@/stores/project";
import { setCustomCss } from "@/services/book/metadata";
import { preserveOpenShortcutKeymap } from "@/components/editor/editor-commands";
const project = useProjectStore();
const host = ref<HTMLElement>();
let view: EditorView | undefined;
// Matches SourceEditor: a definite height makes .cm-scroller the scroll container
// so the editor fills its pane instead of growing past it.
const editorTheme = EditorView.theme({ "&": { height: "100%" } });
function value() {
  return project.book?.customCss ?? customCssTemplate;
}
function mount() {
  if (!host.value) return;
  view = new EditorView({
    state: EditorState.create({
      doc: value(),
      extensions: [
        lineNumbers(),
        history(),
        css(),
        editorTheme,
        keymap.of([...preserveOpenShortcutKeymap, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || !project.book) return;
          project.applyMutation(setCustomCss(project.book, update.state.doc.toString()));
        }),
      ],
    }),
    parent: host.value,
  });
}
onMounted(mount);
watch(
  () => project.bookGeneration,
  () => {
    view?.destroy();
    view = undefined;
    mount();
  },
);
onBeforeUnmount(() => {
  view?.destroy();
});
</script>
<template><div ref="host" class="css-editor" /></template>
