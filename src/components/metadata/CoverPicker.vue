<script setup lang="ts">
import { useSafeI18n } from "@/composables/use-safe-i18n";
import {
  captureImageImportIdentity,
  isImageImportIdentityCurrent,
  type ImageFile,
  type ImageImportIdentity,
} from "@/composables/use-image-import";
import { useProjectStore } from "@/stores/project";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
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
  <Card>
    <CardContent class="flex flex-col gap-3">
      <AspectRatio
        v-if="preview"
        :ratio="1600 / 2560"
        class="w-32 overflow-hidden rounded-lg bg-muted"
      >
        <img :src="preview" :alt="cover ?? ''" class="h-full w-full object-cover" />
      </AspectRatio>
      <div v-if="cover" class="break-all text-sm text-muted-foreground">{{ cover }}</div>
      <p class="text-xs text-muted-foreground">
        {{ t("metadata.coverHint", "Recommended 1600×2560") }}
      </p>
      <div class="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" @click="choose">
          {{ t("metadata.choose", "Choose…") }}
        </Button>
        <Button v-if="cover" type="button" variant="ghost" size="sm" @click="emit('remove')">
          {{ t("metadata.remove", "Remove") }}
        </Button>
      </div>
      <Empty @dragover.prevent @drop="drop">
        <EmptyDescription>{{ t("metadata.drop", "Drop an image here") }}</EmptyDescription>
      </Empty>
    </CardContent>
  </Card>
</template>
