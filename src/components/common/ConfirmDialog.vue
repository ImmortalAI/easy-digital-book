<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    details?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    askAgainLabel?: string;
    showAskAgain?: boolean;
  }>(),
  { showAskAgain: true },
);
const emit = defineEmits<{ confirm: [value: { askAgain: boolean }]; cancel: [] }>();
const confirmButton = ref<HTMLButtonElement>();
const askAgainChoice = ref(true);
const { t } = useSafeI18n();

function focusConfirm() {
  void nextTick(() => confirmButton.value?.focus());
}
watch(
  () => props.open,
  (open) => {
    if (open) focusConfirm();
  },
);
onMounted(() => {
  if (props.open) focusConfirm();
});
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("cancel");
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6"
    @keydown="keydown"
  >
    <section
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      class="rounded-lg border bg-background p-6 shadow-xl"
    >
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <p v-if="details" class="confirm-dialog__details">{{ details }}</p>
      <label v-if="showAskAgain"
        ><input v-model="askAgainChoice" type="checkbox" />
        {{ askAgainLabel ?? t("common.doNotAskAgain", "Do not ask again") }}</label
      >
      <button type="button" @click="emit('cancel')">
        {{ cancelLabel ?? t("common.cancel", "Cancel") }}
      </button>
      <button
        ref="confirmButton"
        data-confirm-delete
        type="button"
        @click="emit('confirm', { askAgain: askAgainChoice })"
      >
        {{ confirmLabel ?? t("common.delete", "Delete") }}
      </button>
    </section>
  </div>
</template>
