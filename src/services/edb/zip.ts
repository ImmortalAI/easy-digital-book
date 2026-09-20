import JSZip from "jszip";

export interface ZipEntry {
  path: string;
  bytes: Uint8Array;
  binary: boolean;
}
const FIXED_DATE = new Date("1980-01-01T00:00:00.000Z");

export async function buildDeterministicZip(entries: ZipEntry[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.path, entry.bytes, {
      date: FIXED_DATE,
      createFolders: false,
      compression: entry.binary ? "STORE" : "DEFLATE",
      compressionOptions: entry.binary ? undefined : { level: 9 },
    });
  }
  return zip.generateAsync({
    type: "uint8array",
    platform: "DOS",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}
