import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createBook } from "@/services/book/create";
import { createInMemoryPlatformServices } from "@/services/platform";
import { useProjectStore } from "@/stores/project";
import { createAutosave } from "../use-autosave";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

const makeBook = () =>
  createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });

describe("autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
  });

  it("writes a complete first recovery snapshot after the debounce", async () => {
    const services = createInMemoryPlatformServices();
    const writeChanges = vi.spyOn(services.recovery, "writeChanges");
    const project = useProjectStore();
    project.configure(services);
    project.setBook(makeBook(), null, { dirty: true });
    const autosave = createAutosave({ project, services });

    project.updateChapterSource("chapter1", "# Changed");
    await nextTick();
    vi.advanceTimersByTime(4_999);
    expect(writeChanges).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await nextTick();
    await Promise.resolve();

    expect(writeChanges).toHaveBeenCalledWith(
      expect.objectContaining({ chapters: [expect.objectContaining({ id: "chapter1" })] }),
      expect.objectContaining({ changedChapters: new Set(["chapter1"]) }),
      null,
    );
    autosave.stop();
  });

  it("removes an in-flight recovery write after its project is replaced", async () => {
    const services = createInMemoryPlatformServices();
    const started = deferred();
    const release = deferred();
    const writeChanges = services.recovery.writeChanges.bind(services.recovery);
    services.recovery.writeChanges = async (...args) => {
      started.resolve();
      await release.promise;
      await writeChanges(...args);
    };
    const project = useProjectStore();
    const original = makeBook();
    project.configure(services);
    project.setBook(original, null, { dirty: true });
    const autosave = createAutosave({ project, services });

    const writing = autosave.persist();
    await started.promise;
    const replacement = makeBook();
    replacement.metadata.id = "550e8400-e29b-41d4-a716-446655440001";
    project.setBook(replacement, null, { dirty: true });
    await services.recovery.remove(original.metadata.id);
    release.resolve();
    await writing;

    expect(await services.recovery.restore(original.metadata.id)).toBeNull();
    autosave.stop();
  });

  it("removes an in-flight recovery write after closing the project", async () => {
    const services = createInMemoryPlatformServices();
    const started = deferred();
    const release = deferred();
    const writeChanges = services.recovery.writeChanges.bind(services.recovery);
    services.recovery.writeChanges = async (...args) => {
      started.resolve();
      await release.promise;
      await writeChanges(...args);
    };
    const project = useProjectStore();
    const original = makeBook();
    project.configure(services);
    project.setBook(original, null, { dirty: true });
    const autosave = createAutosave({ project, services });

    const writing = autosave.persist();
    await started.promise;
    project.invalidateRecovery();
    await services.recovery.remove(original.metadata.id);
    release.resolve();
    await writing;

    expect(await services.recovery.restore(original.metadata.id)).toBeNull();
    autosave.stop();
  });
});
