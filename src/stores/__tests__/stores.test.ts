import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import { createBook } from "@/services/book/create";
import { addChapter } from "@/services/book/chapters";
import { createInMemoryPlatformServices } from "@/services/platform";
import { useProjectStore } from "@/stores/project";
import { useNotificationsStore } from "@/stores/notifications";
import { useLayoutStore } from "@/stores/layout";
import { useSettingsStore } from "@/stores/settings";

const book = () =>
  createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });

describe("application stores", () => {
  it("tracks revision and recovery deltas for mutations", () => {
    setActivePinia(createPinia());
    const project = useProjectStore();
    project.configure(createInMemoryPlatformServices());
    project.setBook(book());
    const result = addChapter(project.book!, { newId: () => "chapter2" });
    project.applyMutation(result);
    expect(project.dirty).toBe(true);
    expect(project.revision).toBe(1);
    expect(project.recoveryDelta.changedChapters).toContain("chapter2");
  });

  it("updates one chapter source through the normal mutation delta", () => {
    setActivePinia(createPinia());
    const project = useProjectStore();
    project.setBook(book());

    project.updateChapterSource("chapter1", "# Changed");

    expect(project.book?.chapters[0]?.source).toBe("# Changed");
    expect(project.revision).toBe(1);
    expect(project.recoveryDelta.changedChapters).toContain("chapter1");
  });

  it("caps notifications at three items", () => {
    setActivePinia(createPinia());
    const notifications = useNotificationsStore();
    notifications.add({ message: "one" });
    notifications.add({ message: "two" });
    notifications.add({ message: "three" });
    notifications.add({ message: "four" });
    expect(notifications.items).toHaveLength(3);
    expect(notifications.items.map((item) => item.message)).toEqual(["two", "three", "four"]);
  });

  it("persists layout settings", async () => {
    setActivePinia(createPinia());
    const services = createInMemoryPlatformServices();
    const layout = useLayoutStore();
    layout.configure(services.settings);
    layout.setSidebarVisible(false);
    await layout.persist();
    expect(await services.settings.get("layout", null)).toMatchObject({ sidebarVisible: false });
  });

  it("keeps late edits dirty when a save was already started", async () => {
    setActivePinia(createPinia());
    const services = createInMemoryPlatformServices();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => (release = resolve));
    const originalWrite = services.files.writeFile.bind(services.files);
    services.files.writeFile = async (...args) => {
      await blocked;
      return originalWrite(...args);
    };
    const project = useProjectStore();
    project.configure(services);
    project.setBook(book(), "book.edb");
    project.applyMutation(addChapter(project.book!, { newId: () => "chapter2" }));
    const saving = project.save();
    await Promise.resolve();
    project.applyMutation(addChapter(project.book!, { newId: () => "chapter3" }));
    release();
    expect(await saving).toBe(true);
    expect(project.savedRevision).toBe(1);
    expect(project.revision).toBe(2);
    expect(project.dirty).toBe(true);
  });

  it("uses atomic file writes and isolates recovery cleanup failures", async () => {
    setActivePinia(createPinia());
    const services = createInMemoryPlatformServices();
    let atomicCalls = 0;
    services.files.writeFileAtomic = async (path, bytes) => {
      atomicCalls++;
      await services.files.writeFile(path, bytes);
    };
    services.recovery.remove = async () => {
      throw new Error("recovery unavailable");
    };
    const project = useProjectStore();
    project.configure(services);
    project.setBook(book(), "book.edb");
    project.applyMutation(addChapter(project.book!, { newId: () => "chapter2" }));
    expect(await project.save()).toBe(true);
    expect(atomicCalls).toBe(1);
    expect(project.dirty).toBe(false);
  });

  it("persists complete export settings with approved defaults", async () => {
    setActivePinia(createPinia());
    const services = createInMemoryPlatformServices();
    const settings = useSettingsStore();
    settings.configure(services.settings);
    await settings.load();
    expect(settings.exportSettings).toEqual({
      imagePreset: "kindle-paperwhite",
      grayscale: false,
      titlePage: true,
      versionInTitle: true,
      lastDir: null,
    });
    settings.exportSettings.imagePreset = "original";
    settings.exportSettings.lastDir = "/tmp";
    await settings.persist();
    expect(await services.settings.get("export", null)).toMatchObject({
      imagePreset: "original",
      lastDir: "/tmp",
    });
  });
});
