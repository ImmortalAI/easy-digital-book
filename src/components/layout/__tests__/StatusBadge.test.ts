import { cleanup, render, screen } from "@testing-library/vue";
import { afterEach, describe, expect, it } from "vitest";
import StatusBadge from "@/components/layout/StatusBadge.vue";

describe("StatusBadge", () => {
  afterEach(cleanup);

  it("maps the default tone to the secondary badge", () => {
    render(StatusBadge, { props: { label: "12 words" } });
    expect(screen.getByText("12 words")).toHaveAttribute("data-variant", "secondary");
  });

  it("maps the warning tone to the destructive badge", () => {
    render(StatusBadge, { props: { label: "3 warnings", tone: "warning" } });
    expect(screen.getByText("3 warnings")).toHaveAttribute("data-variant", "destructive");
  });
});
