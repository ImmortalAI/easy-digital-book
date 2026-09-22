export function randomId(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

export function uniqueRandomId(existing: Iterable<string>, generate = randomId): string {
  const used = new Set(existing);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const candidate = generate();
    if (/^[a-z0-9]{8}$/.test(candidate) && !used.has(candidate)) return candidate;
  }
  throw new Error("Could not generate a unique chapter ID");
}
