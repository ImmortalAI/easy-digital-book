<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { UnsavedAction, UnsavedDecision } from "@/composables/use-unsaved-guard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const props = defineProps<{ action: UnsavedAction | null }>();
const emit = defineEmits<{ decision: [value: UnsavedDecision] }>();
const { t } = useI18n();
</script>

<template>
  <AlertDialog :open="props.action !== null">
    <AlertDialogContent @escape-key-down="emit('decision', 'cancel')">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t("unsaved.title") }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t("unsaved.message") }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="emit('decision', 'cancel')">
          {{ t("common.cancel") }}
        </AlertDialogCancel>
        <AlertDialogAction variant="outline" @click="emit('decision', 'discard')">
          {{ t("unsaved.discard") }}
        </AlertDialogAction>
        <AlertDialogAction @click="emit('decision', 'save')">
          {{ t("common.save") }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
