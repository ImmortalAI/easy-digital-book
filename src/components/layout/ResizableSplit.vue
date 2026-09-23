<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useElementSize } from "@vueuse/core";
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from "reka-ui";
import { useLayoutStore, type LayoutMode } from "@/stores/layout";

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 400;
const PANE_MIN = 240;
// The group sizes its panes from its width minus the 4 px (`w-1`) handle.
const HANDLE_WIDTH = 4;

const props = defineProps<{ singlePane?: boolean }>();
const layout = useLayoutStore();

const content = ref<InstanceType<typeof SplitterPanel>>();
const sourcePanel = ref<InstanceType<typeof SplitterPanel>>();
const previewPanel = ref<InstanceType<typeof SplitterPanel>>();

const { width: contentWidth } = useElementSize(
  computed(() => content.value?.$el as HTMLElement | undefined),
);
// Cap at 50: in a window narrower than two minimums both panes would
// otherwise demand more than half and the group could not satisfy either.
const paneMin = computed(() =>
  Math.min(50, (PANE_MIN / Math.max(contentWidth.value - HANDLE_WIDTH, PANE_MIN * 2)) * 100),
);

// The group falls back to these whenever it re-derives its layout (first
// mount, a changed pane minimum, a mode switch), so they mirror the store.
const sourceDefault = computed(() => {
  if (layout.mode === "text") return 100;
  if (layout.mode === "preview") return 0;
  return layout.splitRatio * 100;
});
// Only a hidden pane may collapse: in Split mode a drag stops at the minimum,
// as it always has, instead of snapping a pane shut.
const collapsible = computed(() => layout.mode !== "split");

function onOuterLayout(sizes: number[]) {
  if (!layout.sidebarVisible || sizes.length < 2) return;
  const width = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(sizes[0] ?? 0)));
  if (width === layout.sidebarWidth) return;
  layout.sidebarWidth = width;
  void layout.persist();
}

// A mode switch makes the group re-derive and re-balance its panes; the
// layouts it reports meanwhile are not a user's choice of ratio.
let switchingMode = false;
function onInnerLayout(sizes: number[]) {
  if (switchingMode || layout.mode !== "split") return;
  layout.splitRatio = (sizes[0] ?? 50) / 100;
  void layout.persist();
}

function applyMode(mode: LayoutMode) {
  const source = sourcePanel.value;
  const preview = previewPanel.value;
  if (!source || !preview) return;
  if (mode === "text") {
    source.expand();
    preview.collapse();
  } else if (mode === "preview") {
    preview.expand();
    source.collapse();
  } else {
    source.resize(layout.splitRatio * 100);
  }
}

watch(
  () => layout.mode,
  () => (switchingMode = true),
  { flush: "sync" },
);
watch(
  () => layout.mode,
  (mode) => {
    applyMode(mode);
    switchingMode = false;
  },
  { flush: "post" },
);

function resetSplit() {
  sourcePanel.value?.resize(50);
  previewPanel.value?.resize(50);
  layout.splitRatio = 0.5;
  void layout.persist();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 overflow-hidden" data-resizable-split>
    <aside
      class="flex w-12 min-w-12 shrink-0 border-r bg-sidebar"
      data-activity-bar
      data-width="48"
    >
      <slot name="activity" />
    </aside>
    <SplitterGroup direction="horizontal" class="flex flex-1" @layout="onOuterLayout">
      <SplitterPanel
        v-if="layout.sidebarVisible"
        :order="1"
        size-unit="px"
        :min-size="SIDEBAR_MIN"
        :max-size="SIDEBAR_MAX"
        :default-size="layout.sidebarWidth"
        class="flex min-w-0 border-r bg-sidebar"
        data-sidebar
      >
        <slot name="sidebar" />
      </SplitterPanel>
      <SplitterResizeHandle
        v-if="layout.sidebarVisible"
        class="w-1 shrink-0 hover:bg-ring focus-visible:bg-ring focus-visible:outline-none"
        aria-label="Resize sidebar"
      />
      <SplitterPanel ref="content" :order="2" class="flex min-w-0">
        <section v-if="props.singlePane" class="editor-single-pane" data-single-pane>
          <slot name="single" />
        </section>
        <SplitterGroup v-else direction="horizontal" class="flex" @layout="onInnerLayout">
          <SplitterPanel
            ref="sourcePanel"
            :order="1"
            :collapsible="collapsible"
            :collapsed-size="0"
            :min-size="paneMin"
            :default-size="sourceDefault"
            class="relative min-h-0 overflow-hidden"
            data-pane="source"
          >
            <slot name="source" />
          </SplitterPanel>
          <SplitterResizeHandle
            v-show="layout.mode === 'split'"
            class="w-1 shrink-0 hover:bg-ring focus-visible:bg-ring focus-visible:outline-none"
            aria-label="Resize editor and preview"
            @dblclick="resetSplit"
          />
          <SplitterPanel
            ref="previewPanel"
            :order="2"
            :collapsible="collapsible"
            :collapsed-size="0"
            :min-size="paneMin"
            :default-size="100 - sourceDefault"
            class="relative min-h-0 overflow-hidden"
            data-pane="preview"
          >
            <slot name="preview" />
          </SplitterPanel>
        </SplitterGroup>
      </SplitterPanel>
    </SplitterGroup>
  </div>
</template>
