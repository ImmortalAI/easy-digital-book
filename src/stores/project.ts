import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Book, BookMutation } from "@/types/book";
import type { PlatformServices, RecoveryDelta } from "@/types/platform";
import { writeEdb } from "@/services/edb/write";

let configuredServices: PlatformServices | undefined;
function copyBook(book: Book): Book {
  return {
    metadata: {
      ...book.metadata,
      authors: [...book.metadata.authors],
      translators: [...book.metadata.translators],
      series: book.metadata.series ? { ...book.metadata.series } : null,
    },
    chapters: book.chapters.map((chapter) => ({ ...chapter })),
    resources: new Map(
      [...book.resources].map(([path, resource]) => [
        path,
        { mediaType: resource.mediaType, bytes: new Uint8Array(resource.bytes) },
      ]),
    ),
    customCss: book.customCss,
  };
}
export const useProjectStore = defineStore("project", () => {
  const book = ref<Book | null>(null),
    filePath = ref<string | null>(null),
    revision = ref(0),
    savedRevision = ref(0),
    fileMtime = ref<number | null>(null),
    saving = ref(false);
  const changedChapters = ref(new Set<string>()),
    removedChapters = ref(new Set<string>()),
    changedResources = ref(new Set<string>()),
    removedResources = ref(new Set<string>());
  const dirty = computed(() => revision.value !== savedRevision.value);
  let services: PlatformServices | undefined = configuredServices;
  function configure(value: PlatformServices) {
    services = value;
  }
  function setServices(value: PlatformServices) {
    configure(value);
  }
  function setBook(value: Book, path: string | null = null) {
    book.value = value;
    filePath.value = path;
    revision.value = 0;
    savedRevision.value = 0;
    fileMtime.value = null;
    clearDelta();
  }
  function clearDelta() {
    changedChapters.value = new Set();
    removedChapters.value = new Set();
    changedResources.value = new Set();
    removedResources.value = new Set();
  }
  function applyMutation(mutation: BookMutation) {
    if (!book.value) throw new Error("No project is open");
    book.value = mutation.book;
    revision.value++;
    const add = <T>(target: Set<T>, values: Set<T>) => {
      for (const value of values) target.add(value);
    };
    add(changedChapters.value, mutation.changedChapters);
    add(removedChapters.value, mutation.removedChapters);
    add(changedResources.value, mutation.changedResources);
    add(removedResources.value, mutation.removedResources);
  }
  const recoveryDelta = computed<RecoveryDelta>(() => ({
    changedChapters: changedChapters.value,
    removedChapters: removedChapters.value,
    changedResources: changedResources.value,
    removedResources: removedResources.value,
  }));
  async function save(path = filePath.value): Promise<boolean> {
    if (!book.value || !path) throw new Error("A file path is required");
    if (!dirty.value && filePath.value === path) return true;
    if (!services) throw new Error("Platform services are not configured");
    if (saving.value) return false;
    saving.value = true;
    const snapshotRevision = revision.value;
    const snapshot = copyBook(book.value);
    try {
      const bytes = await writeEdb(snapshot, new Date());
      await services.files.writeFile(path, bytes);
      filePath.value = path;
      savedRevision.value = snapshotRevision;
      try {
        fileMtime.value = (await services.files.stat(path)).mtime;
      } catch {
        fileMtime.value = null;
      }
      if (revision.value === snapshotRevision) {
        clearDelta();
        await services.recovery.remove(snapshot.metadata.id);
      }
      return true;
    } catch (error) {
      services.logger.error("Failed to save project", { error });
      return false;
    } finally {
      saving.value = false;
    }
  }
  async function saveAs(path: string) {
    return save(path);
  }
  function reset() {
    book.value = null;
    filePath.value = null;
    revision.value = 0;
    savedRevision.value = 0;
    fileMtime.value = null;
    clearDelta();
  }
  return {
    book,
    filePath,
    revision,
    savedRevision,
    fileMtime,
    saving,
    dirty,
    recoveryDelta,
    configure,
    setServices,
    setBook,
    applyMutation,
    save,
    saveAs,
    reset,
  };
});
export function configureProjectServices(services: PlatformServices) {
  configuredServices = services;
}
