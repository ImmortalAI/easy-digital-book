<script setup lang="ts">
import { IconDownload, IconX } from "@tabler/icons-vue";
import type { UpdateInfo } from "@/types/platform";
import { useSafeI18n } from "@/composables/use-safe-i18n";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const props = defineProps<{ update: UpdateInfo }>();
const emit = defineEmits<{ open: [url: string]; dismiss: [] }>();
const { t } = useSafeI18n();
</script>

<template>
  <!-- A third grid column keeps the actions in flow: the registry pins them
       absolutely over a fixed right padding, which a longer title or a
       translated button label would run underneath. -->
  <Alert
    role="status"
    class="w-auto max-w-sm items-center shadow-lg has-[>svg]:grid-cols-[auto_1fr_auto] has-data-[slot=alert-action]:pr-2.5 *:[svg]:translate-y-0"
  >
    <IconDownload aria-hidden="true" />
    <AlertTitle>{{ t("settings.updateAvailable", "A new version is available") }}</AlertTitle>
    <AlertAction class="static col-start-3 row-start-1 flex items-center gap-1">
      <Button size="xs" @click="emit('open', props.update.url)">
        {{ t("settings.openUpdate", "Open release") }}
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        :aria-label="t('settings.dismissUpdate', 'Dismiss update notice')"
        @click="emit('dismiss')"
      >
        <IconX aria-hidden="true" />
      </Button>
    </AlertAction>
  </Alert>
</template>
