import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";

describe("ConfirmDialog review contracts", () => {
  it("focuses the destructive action, supports the ask-again choice, and cancels on Escape", async () => {
    const { emitted } = render(ConfirmDialog, {
      props: { open: true, title: "Delete", message: "Details", showAskAgain: true },
    });
    const confirm = await screen.findByRole("button", { name: "Delete" });
    expect(document.activeElement).toBe(confirm);

    await userEvent.click(screen.getByRole("checkbox", { name: /do not ask again/i }));
    await userEvent.keyboard("{Escape}");
    expect(emitted().cancel).toHaveLength(1);
  });
});
