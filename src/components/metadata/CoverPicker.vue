<script setup lang="ts">
import { useSafeI18n } from "@/composables/use-safe-i18n";
import {
  captureImageImportIdentity,
  isImageImportIdentityCurrent,
  type ImageFile,
  type ImageImportIdentity,
} from "@/composables/use-image-import";
import { useProjectStore } from "@/stores/project";
const { t } = useSafeI18n();
const project = useProjectStore();
const props = defineProps<{
  cover: string | null;
  preview?: string;
  onPick?: () => Promise<void>;
  onDropFile?: (file: ImageFile, identity: ImageImportIdentity) => Promise<void>;
}>();
const emit = defineEmits<{ choose: []; remove: [] }>();
async function choose() {
  emit("choose");
  await props.onPick?.();
}
async function drop(event: DragEvent) {
  const file = [...(event.dataTransfer?.files ?? [])].find((item) =>
    item.type.startsWith("image/"),
  );
  if (!file || !props.onDropFile) return;
  const identity = captureImageImportIdentity(project);
  if (!identity) return;
  event.preventDefault();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isImageImportIdentityCurrent(project, identity)) return;
  await props.onDropFile(
    {
      name: file.name || "cover.png",
      bytes,
      type: file.type,
    },
    identity,
  );
}
</script>
<template>
  <div class="cover-picker">
    <img v-if="preview" :src="preview" :alt="cover ?? 'Cover'" class="cover-picker__thumbnail" />
    <div v-if="cover" class="cover-picker__path">{{ cover }}</div>
    <small>{{ t("metadata.coverHint", "Recommended 1600×2560") }}</small>
    <button type="button" @click="choose">{{ t("metadata.choose", "Choose…") }}</button>
    <div class="cover-picker__drop" @dragover.prevent @drop="drop">
      {{ t("metadata.drop", "Drop an image here") }}
    </div>
    <button v-if="cover" type="button" @click="emit('remove')">
      {{ t("metadata.remove", "Remove") }}
    </button>
  </div>
</template>
