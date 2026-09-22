<script setup lang="ts">
import { useSafeI18n } from "@/composables/use-safe-i18n";
const { t } = useSafeI18n();
defineProps<{ path: string; cover: boolean; unused: boolean }>();
const emit = defineEmits<{ select: []; contextmenu: [event: MouseEvent] }>();
</script>
<template>
  <button
    class="explorer-image"
    :class="{ unused }"
    type="button"
    @click="emit('select')"
    @contextmenu.prevent="emit('contextmenu', $event)"
  >
    {{ path.replace(/^images\//, "") }} <small v-if="cover">★</small
    ><small v-if="unused"> — {{ t("images.unused", "not used") }}</small>
  </button>
</template>
