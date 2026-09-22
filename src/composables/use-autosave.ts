import { useDebounceFn } from "@vueuse/core";
import { onScopeDispose, watch } from "vue";
import type { PlatformServices } from "@/types/platform";
import { useNotificationsStore } from "@/stores/notifications";
import { snapshotBook, useProjectStore } from "@/stores/project";
import type { ProjectFilesController } from "@/composables/use-project-files";

export interface AutosaveOptions {
  project?: ReturnType<typeof useProjectStore>;
  services: PlatformServices;
  debounceMs?: number;
  maxWaitMs?: number;
}

export function createAutosave(options: AutosaveOptions) {
  const project = options.project ?? useProjectStore();
  const notifications = useNotificationsStore();
  let bookId: string | null = null;
  let persistedBookId: string | null = null;
  let writing = false;
  let reschedule = false;
  let stopped = false;
  let errorNotifiedFor: string | null = null;

  const removeStaleSession = async (id: string) => {
    try {
      await options.services.recovery.remove(id);
    } catch (error) {
      options.services.logger.warn("Could not remove stale recovery session", { error });
    }
  };

  const persist = async () => {
    const current = project.book;
    if (stopped || !current || !project.dirty) return;
    if (writing) {
      reschedule = true;
      return;
    }
    writing = true;
    const currentBookId = current.metadata.id;
    const generationAtStart = project.bookGeneration;
    const recoveryGenerationAtStart = project.recoveryGeneration;
    const revisionAtStart = project.revision;
    if (bookId !== currentBookId) {
      bookId = currentBookId;
      persistedBookId = null;
      errorNotifiedFor = null;
    }
    const delta =
      persistedBookId === currentBookId
        ? {
            changedChapters: new Set(project.recoveryDelta.changedChapters),
            removedChapters: new Set(project.recoveryDelta.removedChapters),
            changedResources: new Set(project.recoveryDelta.changedResources),
            removedResources: new Set(project.recoveryDelta.removedResources),
          }
        : {
            changedChapters: new Set(current.chapters.map(({ id }) => id)),
            removedChapters: new Set<string>(),
            changedResources: new Set(current.resources.keys()),
            removedResources: new Set<string>(),
          };
    try {
      await options.services.recovery.writeChanges(snapshotBook(current), delta, project.filePath);
      const isCurrent =
        !stopped &&
        project.bookGeneration === generationAtStart &&
        project.recoveryGeneration === recoveryGenerationAtStart &&
        project.book?.metadata.id === currentBookId;
      if (!isCurrent || !project.dirty) {
        await removeStaleSession(currentBookId);
        return;
      }
      persistedBookId = currentBookId;
      if (project.revision !== revisionAtStart) reschedule = true;
    } catch (error) {
      options.services.logger.error("Autosave failed", { error });
      if (
        !stopped &&
        project.bookGeneration === generationAtStart &&
        project.recoveryGeneration === recoveryGenerationAtStart &&
        errorNotifiedFor !== currentBookId
      ) {
        notifications.add({ message: "Autosave failed", kind: "error" });
        errorNotifiedFor = currentBookId;
      }
    } finally {
      writing = false;
      if (reschedule && !stopped && project.dirty) {
        reschedule = false;
        void schedule();
      }
    }
  };

  const schedule = useDebounceFn(persist, options.debounceMs ?? 5_000, {
    maxWait: options.maxWaitMs ?? 30_000,
  });
  const stop = watch(
    () =>
      [
        project.recoveryGeneration,
        project.bookGeneration,
        project.book?.metadata.id,
        project.revision,
        project.dirty,
      ] as const,
    ([recoveryGeneration, , nextBookId, , dirty], previous) => {
      if (previous && recoveryGeneration !== previous[0]) {
        schedule.cancel();
        return;
      }
      if (nextBookId !== bookId) {
        bookId = nextBookId ?? null;
        persistedBookId = null;
        errorNotifiedFor = null;
      }
      if (dirty) void schedule();
      else schedule.cancel();
    },
    { immediate: true },
  );

  return {
    schedule,
    persist,
    stop() {
      stopped = true;
      stop();
      schedule.cancel();
    },
  };
}

export function useAutosave(options: AutosaveOptions) {
  const autosave = createAutosave(options);
  onScopeDispose(autosave.stop);
  return autosave;
}

export function useProjectAutosave(
  controller: Pick<ProjectFilesController, "project" | "services">,
) {
  return useAutosave({ project: controller.project, services: controller.services });
}
