interface Sized {
  bytes: { length: number };
}

/**
 * A least-recently-used cache bounded by the total size of what it holds.
 *
 * Processed images are cached by content hash and plan, so an unbounded map
 * keeps a full copy of every image of every export for the lifetime of the
 * process: changing the preset, toggling grayscale or exporting several books
 * in one session all accumulate. The budget is in bytes rather than entries
 * because the entries are image payloads and vary by orders of magnitude.
 */
export function createByteLru<T extends Sized>(maxBytes: number) {
  const entries = new Map<string, T>();
  let total = 0;

  function drop(key: string) {
    const value = entries.get(key);
    if (!value) return;
    total -= value.bytes.length;
    entries.delete(key);
  }

  return {
    get(key: string): T | undefined {
      const value = entries.get(key);
      if (!value) return undefined;
      // Re-insert so Map iteration order stays least-recently-used first.
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(key: string, value: T): void {
      drop(key);
      entries.set(key, value);
      total += value.bytes.length;
      // Keep the newest entry even when it alone exceeds the budget, so a
      // single oversized image cannot leave the cache permanently empty.
      while (total > maxBytes && entries.size > 1) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        drop(oldest);
      }
    },
    clear(): void {
      entries.clear();
      total = 0;
    },
    get size(): number {
      return entries.size;
    },
    get byteLength(): number {
      return total;
    },
  };
}
