import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import LanguageCombobox from "@/components/metadata/LanguageCombobox.vue";

describe("LanguageCombobox", () => {
  // vitest.config.ts runs without `globals: true`, so @testing-library/vue's
  // auto-cleanup (which detects a global `afterEach`) never registers; each
  // render() would otherwise pile up in document.body across tests.
  afterEach(cleanup);

  it("suggests known tags but accepts any valid one", async () => {
    const { emitted } = render(LanguageCombobox, { props: { modelValue: "en" } });
    const input = screen.getByRole("combobox", { name: /language/i });
    await userEvent.clear(input);
    await userEvent.type(input, "pt-BR");
    // pt-BR is not in the suggestion list but is a valid BCP 47 tag.
    expect(emitted()["update:modelValue"]!.at(-1)).toEqual(["pt-BR"]);
    expect(emitted().invalid).toBeUndefined();
  });

  it("shows the passed-in error message", () => {
    render(LanguageCombobox, { props: { modelValue: "en", error: "Invalid language tag" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid language tag");
  });

  it("validates the committed value once the field is blurred", async () => {
    const { emitted } = render(LanguageCombobox, { props: { modelValue: "en" } });
    const input = screen.getByRole("combobox", { name: /language/i });
    await userEvent.clear(input);
    await userEvent.type(input, "123");
    expect(emitted().invalid).toBeUndefined();

    await userEvent.tab();

    expect(emitted().invalid).toBeTruthy();
    expect(emitted().invalid!.at(-1)).toEqual(["Invalid language tag"]);
  });
});
