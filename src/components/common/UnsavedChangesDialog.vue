<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { UnsavedAction, UnsavedDecision } from "@/composables/use-unsaved-guard";

defineProps<{ action: UnsavedAction | null }>();
const emit = defineEmits<{ decision: [value: UnsavedDecision] }>();
const { t } = useI18n();
</script>

<template>
  <div v-if="action" class="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6">
    <section
      class="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="t('unsaved.title')"
    >
      <h2 class="text-lg font-semibold">{{ t("unsaved.title") }}</h2>
      <p class="text-sm text-muted-foreground">{{ t("unsaved.message") }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" @click="emit('decision', 'cancel')">{{ t("common.cancel") }}</button>
        <button type="button" @click="emit('decision', 'discard')">
          {{ t("unsaved.discard") }}
        </button>
        <button
          class="rounded-md bg-primary px-3 py-2 text-primary-foreground"
          type="button"
          @click="emit('decision', 'save')"
        >
          {{ t("common.save") }}
        </button>
      </div>
    </section>
  </div>
</template>
