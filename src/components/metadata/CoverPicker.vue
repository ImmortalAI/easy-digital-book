<script setup lang="ts">
import { useSafeI18n } from "@/composables/use-safe-i18n";
const { t } = useSafeI18n();
defineProps<{ cover: string | null }>();
const emit = defineEmits<{ choose: []; remove: [] }>();
</script>
<template>
  <div class="cover-picker">
    <div v-if="cover" class="cover-picker__path">{{ cover }}</div>
    <small>{{ t("metadata.coverHint", "Recommended 1600×2560") }}</small>
    <button type="button" @click="emit('choose')">{{ t("metadata.choose", "Choose…") }}</button>
    <button v-if="cover" type="button" @click="emit('remove')">
      {{ t("metadata.remove", "Remove") }}
    </button>
  </div>
</template>
