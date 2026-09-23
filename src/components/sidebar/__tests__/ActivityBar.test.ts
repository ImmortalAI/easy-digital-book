import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ActivityBar from "@/components/sidebar/ActivityBar.vue";

describe("ActivityBar", () => {
  // ActivityBar renders more than once across these tests; without cleanup
  // the next render's query could match a leftover node from the previous one.
  afterEach(() => cleanup());

  it("names every activity and reports the selection", async () => {
    const { emitted } = render(ActivityBar, { props: { active: "explorer" } });
    expect(screen.getByRole("button", { name: "Explorer" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(emitted().select[0]).toEqual(["search"]);
  });

  it("re-reports the active activity, never an empty selection, when the active item is re-clicked", async () => {
    // Reka's single-mode ToggleGroup deselects the active item on re-click,
    // which would otherwise report an empty model value. The bar must
    // swallow that and report the still-active value instead — EditorView
    // relies on receiving this click (it toggles sidebar visibility) without
    // the activity itself ever going empty or losing its pressed state.
    const { emitted } = render(ActivityBar, { props: { active: "explorer" } });
    await userEvent.click(screen.getByRole("button", { name: "Explorer" }));
    expect(emitted().select[0]).toEqual(["explorer"]);
    expect(screen.getByRole("button", { name: "Explorer" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
