<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayoutStore } from "@/stores/layout";
import {
  clampSplitRatio,
  clampSidebarWidth,
  useResizable,
  PANE_MIN,
} from "@/composables/use-resizable";

const ACTIVITY_BAR_WIDTH = 48;
const props = defineProps<{ singlePane?: boolean }>();
const layout = useLayoutStore();
const root = ref<HTMLElement>();
const sidebarStyle = computed(() => ({ width: `${clampSidebarWidth(layout.sidebarWidth)}px` }));
function contentWidth() {
  const rootWidth = root.value?.clientWidth || 1000;
  const sidebarWidth = layout.sidebarVisible ? clampSidebarWidth(layout.sidebarWidth) : 0;
  return rootWidth - ACTIVITY_BAR_WIDTH - sidebarWidth;
}
const sourceStyle = computed(() => ({
  flex: layout.mode === "split" ? `${layout.splitRatio} 1 0%` : "1 1 100%",
  minWidth: `${PANE_MIN}px`,
}));
const previewStyle = computed(() => ({
  flex: layout.mode === "split" ? `${1 - layout.splitRatio} 1 0%` : "1 1 100%",
  minWidth: `${PANE_MIN}px`,
}));
const resizable = useResizable({
  getContentWidth: () => {
    const main = root.value?.querySelector<HTMLElement>(":scope > .resizable-split__content");
    return main?.clientWidth || contentWidth();
  },
  getSidebarWidth: () => layout.sidebarWidth,
  setSidebarWidth: (value) => (layout.sidebarWidth = clampSidebarWidth(value)),
  getSplitRatio: () => layout.splitRatio,
  setSplitRatio: (value) => {
    const width = Math.max(contentWidth(), PANE_MIN * 2);
    layout.splitRatio = clampSplitRatio(value, width);
  },
  persist: () => layout.persist(),
});
</script>

<template>
  <div ref="root" class="resizable-split" data-resizable-split>
    <aside class="resizable-split__activity" data-activity-bar data-width="48">
      <slot name="activity" />
    </aside>
    <aside v-if="layout.sidebarVisible" class="resizable-split__sidebar" :style="sidebarStyle">
      <slot name="sidebar" />
    </aside>
    <button
      v-if="layout.sidebarVisible"
      class="resizable-split__handle"
      data-resize="sidebar"
      type="button"
      aria-label="Resize sidebar"
      @pointerdown="resizable.begin('sidebar', $event)"
    />
    <main class="resizable-split__content">
      <section v-if="props.singlePane" class="editor-single-pane">
        <slot name="single" />
      </section>
      <template v-else>
        <section
          v-show="layout.mode !== 'preview'"
          data-pane="source"
          class="resizable-split__pane"
          :style="sourceStyle"
        >
          <slot name="source" />
        </section>
        <button
          v-show="layout.mode === 'split'"
          class="resizable-split__handle"
          data-resize="content"
          type="button"
          aria-label="Resize editor and preview"
          @pointerdown="resizable.begin('content', $event)"
          @dblclick="resizable.resetSplit"
        />
        <section
          v-show="layout.mode !== 'text'"
          data-pane="preview"
          class="resizable-split__pane"
          :style="previewStyle"
        >
          <slot name="preview" />
        </section>
      </template>
    </main>
  </div>
</template>
