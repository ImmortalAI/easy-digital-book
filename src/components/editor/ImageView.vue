<script setup lang="ts">
import { computed } from "vue";
import { useProjectStore } from "@/stores/project";
import { useLayoutStore } from "@/stores/layout";
import { collectImageUsage } from "@/services/checks/image-usage";
import { extractTitle } from "@/services/book/extract-title";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { imageDimensions } from "@/services/book/image-dimensions";
const { t } = useSafeI18n();
const props = defineProps<{ path: string }>();
const project = useProjectStore();
const layout = useLayoutStore();
const resource = computed(() => project.book?.resources.get(props.path));
const dimensions = computed(() =>
  resource.value ? imageDimensions(resource.value.bytes, resource.value.mediaType) : null,
);
const usage = computed(() =>
  project.book ? (collectImageUsage(project.book).get(props.path) ?? []) : [],
);
const src = computed(() =>
  resource.value
    ? `data:${resource.value.mediaType};base64,${bytesToBase64(resource.value.bytes)}`
    : "",
);
function openChapter(id: string) {
  layout.center = { kind: "chapter", id };
}
function bytesToBase64(bytes: Uint8Array) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}
</script>
<template>
  <section class="image-view" v-if="resource">
    <img :src="src" :alt="path" />
    <h2>{{ path }}</h2>
    <p v-if="dimensions">{{ dimensions.width }}×{{ dimensions.height }} px</p>
    <p>{{ resource.bytes.byteLength }} {{ t("metadata.bytes", "bytes") }}</p>
    <h3>{{ t("images.usedIn", "Used in") }}</h3>
    <ul>
      <li v-for="id in usage" :key="id">
        <button type="button" @click="openChapter(id)">
          {{
            extractTitle(
              project.book!.chapters.find((chapter) => chapter.id === id)?.source ?? "",
            ) || id
          }}
        </button>
      </li>
      <li v-if="!usage.length">{{ t("images.unused", "not used") }}</li>
    </ul>
  </section>
</template>
