export function isUuid(value: string): boolean {
  return /^(?:urn:uuid:)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
export function canonicalUuid(value: string): string {
  const uuid = value.replace(/^urn:uuid:/i, "").toLowerCase();
  if (!isUuid(uuid)) throw new Error("Invalid UUID");
  return `urn:uuid:${uuid}`;
}
