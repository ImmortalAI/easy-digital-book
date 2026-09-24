import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import LanguageCombobox from "@/components/metadata/LanguageCombobox.vue";

describe("LanguageCombobox", () => {
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
});
