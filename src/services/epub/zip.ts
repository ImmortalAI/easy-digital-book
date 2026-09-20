import JSZip from "jszip";
export async function makeZip(entries: Array<[string, string | Uint8Array]>): Promise<Uint8Array> {
  const zip = new JSZip();
  const date = new Date("2000-01-01T00:00:00Z");
  for (const [name, data] of entries)
    zip.file(
      name,
      data,
      name === "mimetype"
        ? { compression: "STORE", createFolders: false, date }
        : { compression: "DEFLATE", compressionOptions: { level: 9 }, createFolders: false, date },
    );
  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "DOS",
  });
}
