import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBook } from "@/services/book/create";
import { useProjectStore } from "@/stores/project";
import MetadataForm from "@/components/metadata/MetadataForm.vue";

function installBook(coverBytes = new Uint8Array([1, 2, 3, 4])) {
  const project = useProjectStore();
  const book = createBook({
    locale: "en",
    now: new Date("2026-01-01"),
    newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
    newChapterId: () => "chapter1",
  });
  book.resources.set("images/cover.png", { bytes: coverBytes, mediaType: "image/png" });
  book.metadata.cover = "images/cover.png";
  project.setBook(book);
  return project;
}

describe("MetadataForm cover preview", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("does not rebuild the cover preview while unrelated metadata is typed", async () => {
    installBook();
    const create = vi.spyOn(URL, "createObjectURL");
    const wrapper = mount(MetadataForm);
    expect(create).toHaveBeenCalledTimes(1);

    const title = wrapper.get('input:not([type="checkbox"])');
    for (const value of ["A", "Ab", "Abc", "Abcd", "Abcde"]) await title.setValue(value);

    // Every patch replaces the book object; the cover bytes never changed, so
    // the preview must not be re-encoded once per keystroke.
    expect(create).toHaveBeenCalledTimes(1);
    create.mockRestore();
    wrapper.unmount();
  });

  it("rebuilds the preview when the cover itself changes", async () => {
    const project = installBook();
    const create = vi.spyOn(URL, "createObjectURL");
    const wrapper = mount(MetadataForm);
    const initial = create.mock.calls.length;

    const book = project.book!;
    const resources = new Map(book.resources);
    resources.set("images/cover.png", { bytes: new Uint8Array([9, 9]), mediaType: "image/png" });
    project.applyMutation({
      book: { ...book, resources },
      changedChapters: new Set(),
      removedChapters: new Set(),
      changedResources: new Set(["images/cover.png"]),
      removedResources: new Set(),
    });
    await wrapper.vm.$nextTick();

    expect(create.mock.calls.length).toBeGreaterThan(initial);
    create.mockRestore();
    wrapper.unmount();
  });

  it("releases the object URL when the form goes away", async () => {
    installBook();
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const wrapper = mount(MetadataForm);
    await wrapper.vm.$nextTick();

    wrapper.unmount();

    expect(revoke).toHaveBeenCalled();
    revoke.mockRestore();
  });
});

describe("MetadataForm language field", () => {
  beforeEach(() => setActivePinia(createPinia()));
  // @testing-library/vue's auto-cleanup needs a global `afterEach`, which
  // this project's vitest config (no `globals: true`) doesn't provide.
  afterEach(cleanup);

  it("labels the language field exactly once, with no duplicated text", () => {
    installBook();
    render(MetadataForm);

    // The field's own Field+Label is the single source of the "Language"
    // text and the combobox's accessible name — MetadataForm no longer
    // wraps LanguageCombobox in a second <label>Language…</label>.
    expect(screen.getAllByText("Language")).toHaveLength(1);
    expect(screen.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
  });
});

describe("MetadataForm field labelling", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    const project = useProjectStore();
    const book = createBook({
      locale: "en",
      now: new Date("2026-01-01"),
      newUuid: () => "550e8400-e29b-41d4-a716-446655440000",
      newChapterId: () => "chapter1",
    });
    // A series-less book keeps the volume spinbutton disabled, and at least
    // one author is needed for a "move up" button to exist at all.
    book.metadata.authors = ["Ann"];
    project.setBook(book);
  });
  afterEach(cleanup);

  it("labels every field and names the contributor controls", async () => {
    render(MetadataForm, { global: { plugins: [pinia] } });
    await userEvent.type(screen.getByRole("textbox", { name: /^title$/i }), "!");
    expect(useProjectStore().book!.metadata.title).toContain("!");
    expect(screen.getByRole("spinbutton", { name: /volume/i })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /move author up/i })[0]).toBeDisabled();
  });
});
