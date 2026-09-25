<script setup lang="ts">
import { ref, watch } from "vue";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import {
  errorTranslationKey,
  type UnexpectedErrorReport,
} from "@/services/platform/error-reporting";
import type { ErrorActions } from "@/composables/use-error-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const props = defineProps<{ report: UnexpectedErrorReport | null; actions: ErrorActions }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useSafeI18n();
const copied = ref(false);
const open = ref(false);
// The parent clears `report` as soon as the dialog asks to close; the last one
// stays on screen while the exit animation plays, so the dialog stays mounted.
const shown = ref<UnexpectedErrorReport | null>(null);

watch(
  () => props.report,
  (report) => {
    if (!report) return;
    shown.value = report;
    copied.value = false;
    open.value = true;
  },
  { immediate: true },
);
watch(open, (value) => {
  if (!value) emit("close");
});

async function copyDetails() {
  await props.actions.copyDetails(shown.value!);
  copied.value = true;
}

const openLogs = () => props.actions.openLogs();
const reportIssue = () => props.actions.reportIssue(shown.value!);
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      v-if="shown"
      role="alertdialog"
      :show-close-button="false"
      class="grid gap-3 sm:max-w-lg"
    >
      <DialogHeader>
        <DialogTitle>
          {{
            t(errorTranslationKey(shown.code), t("errors.title", "An unexpected error occurred"))
          }}
        </DialogTitle>
        <DialogDescription>
          {{ t("errors.explanation", "The error was recorded without book contents.") }}
        </DialogDescription>
      </DialogHeader>
      <ScrollArea class="border-border max-h-64 rounded-md border">
        <pre class="p-3 text-xs whitespace-pre-wrap">{{ shown.details }}</pre>
      </ScrollArea>
      <p v-if="copied" role="status" class="text-primary text-sm">
        {{ t("errors.copied", "Details copied") }}
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" @click="copyDetails">
          {{ t("errors.copy", "Copy details") }}
        </Button>
        <Button type="button" variant="outline" @click="openLogs">
          {{ t("errors.openLogs", "Log folder") }}
        </Button>
        <Button type="button" variant="outline" @click="reportIssue">
          {{ t("errors.report", "Report issue") }}
        </Button>
        <Button type="button" @click="open = false">{{ t("common.close", "Close") }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
