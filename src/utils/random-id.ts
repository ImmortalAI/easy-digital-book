export function randomId(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}
