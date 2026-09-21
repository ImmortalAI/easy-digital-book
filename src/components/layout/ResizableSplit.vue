<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayoutStore } from "@/stores/layout";
import {
  clampSplitRatio,
  clampSidebarWidth,
  useResizable,
  PANE_MIN,
} from "@/composables/use-resizable";

const layout = useLayoutStore();
const root = ref<HTMLElement>();
const sidebarStyle = computed(() => ({ width: `${clampSidebarWidth(layout.sidebarWidth)}px` }));
const sourceStyle = computed(() => ({
  flex: layout.mode === "split" ? `${layout.splitRatio} 1 0%` : "1 1 100%",
  minWidth: `${PANE_MIN}px`,
}));
const previewStyle = computed(() => ({
  flex: layout.mode === "split" ? `${1 - layout.splitRatio} 1 0%` : "1 1 100%",
  minWidth: `${PANE_MIN}px`,
}));
const resizable = useResizable({
  getContainerWidth: () => root.value?.clientWidth || 1000,
  getSidebarWidth: () => layout.sidebarWidth,
  setSidebarWidth: (value) => (layout.sidebarWidth = clampSidebarWidth(value)),
  getSplitRatio: () => layout.splitRatio,
  setSplitRatio: (value) => {
    const width = Math.max((root.value?.clientWidth || 1000) - layout.sidebarWidth, PANE_MIN * 2);
    layout.splitRatio = clampSplitRatio(value, width);
  },
  persist: () => layout.persist(),
});
</script>

<template>
  <div ref="root" class="resizable-split" data-resizable-split>
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
      <section
        v-if="layout.mode !== 'preview'"
        data-pane="source"
        class="resizable-split__pane"
        :style="sourceStyle"
      >
        <slot name="source" />
      </section>
      <button
        v-if="layout.mode === 'split'"
        class="resizable-split__handle"
        data-resize="content"
        type="button"
        aria-label="Resize editor and preview"
        @pointerdown="resizable.begin('content', $event)"
        @dblclick="resizable.resetSplit"
      />
      <section
        v-if="layout.mode !== 'text'"
        data-pane="preview"
        class="resizable-split__pane"
        :style="previewStyle"
      >
        <slot name="preview" />
      </section>
    </main>
  </div>
</template>
