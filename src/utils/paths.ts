export function normalizeResourceName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "image";
  const dot = base.lastIndexOf(".");
  const extension = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  const stem =
    (dot > 0 ? base.slice(0, dot) : base)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "image";
  return `${stem}${extension ? `.${extension}` : ""}`;
}
export function uniqueResourcePath(existing: Iterable<string>, fileName: string): string {
  const used = new Set(existing);
  const safe = normalizeResourceName(fileName);
  if (!used.has(`images/${safe}`)) return `images/${safe}`;
  const dot = safe.lastIndexOf(".");
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : "";
  for (let n = 2; ; n++) {
    const candidate = `images/${stem}-${n}${ext}`;
    if (!used.has(candidate)) return candidate;
  }
}
