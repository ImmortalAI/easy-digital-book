import { describe, expect, it } from "vitest";
import { createByteLru } from "@/utils/byte-lru";

const entry = (size: number) => ({ bytes: new Uint8Array(size) });

describe("byte-bounded LRU", () => {
  it("serves cached entries and tracks the total size", () => {
    const cache = createByteLru<{ bytes: Uint8Array }>(100);
    const value = entry(10);
    cache.set("a", value);

    expect(cache.get("a")).toBe(value);
    expect(cache.byteLength).toBe(10);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts the least recently used entry once over budget", () => {
    const cache = createByteLru<{ bytes: Uint8Array }>(100);
    cache.set("a", entry(40));
    cache.set("b", entry(40));
    cache.get("a"); // "a" is now the most recently used
    cache.set("c", entry(40));

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
    expect(cache.byteLength).toBe(80);
  });

  it("does not double-count a key that is written twice", () => {
    const cache = createByteLru<{ bytes: Uint8Array }>(100);
    cache.set("a", entry(30));
    cache.set("a", entry(50));

    expect(cache.size).toBe(1);
    expect(cache.byteLength).toBe(50);
  });

  it("keeps an entry larger than the whole budget rather than dropping it", () => {
    const cache = createByteLru<{ bytes: Uint8Array }>(100);
    cache.set("a", entry(20));
    cache.set("big", entry(500));

    expect(cache.get("big")).toBeDefined();
    expect(cache.size).toBe(1);
  });

  it("stays bounded across many inserts", () => {
    const cache = createByteLru<{ bytes: Uint8Array }>(100);
    for (let i = 0; i < 1000; i++) cache.set(`k${i}`, entry(25));

    expect(cache.byteLength).toBeLessThanOrEqual(100);
    expect(cache.size).toBeLessThanOrEqual(4);
  });
});
