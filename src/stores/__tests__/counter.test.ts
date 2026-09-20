import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCounterStore } from "../counter";

describe("counter store", () => {
  it("increments the count", () => {
    setActivePinia(createPinia());
    const counter = useCounterStore();

    expect(counter.count).toBe(0);

    counter.increment();

    expect(counter.count).toBe(1);
  });
});
