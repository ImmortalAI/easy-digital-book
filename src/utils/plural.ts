export function pluralRu(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;
  return n >= 11 && n <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many;
}
