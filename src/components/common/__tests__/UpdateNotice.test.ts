import { cleanup, render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import UpdateNotice from "@/components/common/UpdateNotice.vue";
import { createI18nPlugin } from "@/plugins/i18n";

const update = { version: "2.0.0", url: "https://example.com/release" };

describe("UpdateNotice", () => {
  afterEach(cleanup);

  it("opens the release", async () => {
    const { emitted } = render(UpdateNotice, { props: { update } });

    await userEvent.click(screen.getByRole("button", { name: "Open release" }));

    expect(emitted("open")).toEqual([["https://example.com/release"]]);
  });

  it("can be dismissed", async () => {
    const { emitted } = render(UpdateNotice, { props: { update } });

    await userEvent.click(screen.getByRole("button", { name: "Dismiss update notice" }));

    expect(emitted("dismiss")).toHaveLength(1);
  });

  it("names the dismiss button in the interface language", () => {
    render(UpdateNotice, { props: { update }, global: { plugins: [createI18nPlugin("ru")] } });

    expect(
      screen.getByRole("button", { name: "Скрыть уведомление об обновлении" }),
    ).toBeInTheDocument();
  });
});
