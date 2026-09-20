import type { ManifestEnvelope } from "@/types/manifest";

export function migrateManifest(manifest: ManifestEnvelope, fromVersion: number): ManifestEnvelope {
  let current = { ...manifest };
  if (fromVersion === 0) {
    current = { ...current, formatVersion: 1 };
  }
  if (current.formatVersion !== 1) throw new Error(`Unsupported migration from ${fromVersion}`);
  return current;
}
