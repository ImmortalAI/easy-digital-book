import { createPinia, setActivePinia } from "pinia";
import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WarningsPopover from "@/components/editor/WarningsPopover.vue";
import { useDiagnosticsStore } from "@/stores/diagnostics";
import { createI18nPlugin, type SupportedLocale } from "@/plugins/i18n";

function renderPopover(locale: SupportedLocale = "en") {
  return render(WarningsPopover, {
    props: { chapterId: "c1" },
    global: { plugins: [createI18nPlugin(locale)] },
  });
}

describe("WarningsPopover", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(cleanup);

  function seedTwoWarnings() {
    const diagnostics = useDiagnosticsStore();
    diagnostics.setChapterDiagnostics("c1", [{ severity: "warning", message: "NovLang warning" }]);
    diagnostics.setBookWarnings([{ code: "book.cover", message: "Missing cover" }]);
  }

  it("names the warning count and lists both groups", async () => {
    seedTwoWarnings();
    renderPopover();

    await userEvent.click(screen.getByRole("button", { name: /2 warnings/i }));

    expect(await screen.findByRole("heading", { name: /current chapter/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /^book$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: "NovLang warning" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Missing cover" })).toBeVisible();
  });

  it("pluralises the warning count per locale", () => {
    useDiagnosticsStore().setBookWarnings([{ code: "book.cover", message: "Missing cover" }]);
    renderPopover();
    expect(screen.getByRole("button", { name: "1 warning" })).toBeInTheDocument();
    cleanup();

    renderPopover("ru");
    expect(screen.getByRole("button", { name: "1 предупреждение" })).toBeInTheDocument();
  });

  it("emits the selected warning and closes", async () => {
    seedTwoWarnings();
    const { emitted } = renderPopover();

    await userEvent.click(screen.getByRole("button", { name: /2 warnings/i }));
    await userEvent.click(await screen.findByRole("button", { name: "Missing cover" }));

    expect(emitted().select).toEqual([[{ code: "book.cover", message: "Missing cover" }]]);
    expect(screen.queryByRole("heading", { name: /current chapter/i })).not.toBeInTheDocument();
  });

  it("localizes empty warning groups", async () => {
    renderPopover();

    await userEvent.click(screen.getByRole("button", { name: /0 warnings/i }));

    expect(await screen.findAllByText("No warnings")).toHaveLength(2);
  });
});
