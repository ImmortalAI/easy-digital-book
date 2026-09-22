<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  showAskAgain?: boolean;
}>();
const emit = defineEmits<{ confirm: [value: { askAgain: boolean }]; cancel: [] }>();
const dialog = ref<HTMLElement>();
const askAgainChoice = ref(true);
watch(
  () => props.open,
  (open) => {
    if (open) void nextTick(() => dialog.value?.focus());
  },
);
onMounted(() => {
  if (props.open) dialog.value?.focus();
});
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("cancel");
}
</script>
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6"
    @keydown="keydown"
  >
    <section
      ref="dialog"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      class="rounded-lg border bg-background p-6 shadow-xl"
    >
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <label v-if="showAskAgain"
        ><input v-model="askAgainChoice" type="checkbox" /> Do not ask again</label
      >
      <button type="button" @click="emit('cancel')">Cancel</button>
      <button type="button" @click="emit('confirm', { askAgain: askAgainChoice })">
        {{ confirmLabel ?? "Delete" }}
      </button>
    </section>
  </div>
</template>
