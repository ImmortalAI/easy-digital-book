import JSZip from "jszip";
export async function makeZip(entries: Array<[string, string | Uint8Array]>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, data] of entries)
    zip.file(
      name,
      data,
      name === "mimetype"
        ? { compression: "STORE", createFolders: false }
        : { compression: "DEFLATE", compressionOptions: { level: 9 }, createFolders: false },
    );
  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "DOS",
  });
}
