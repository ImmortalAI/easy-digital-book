import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8")) as {
  version?: unknown;
};
if (typeof packageJson.version !== "string" || !/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  throw new Error("package.json must contain a semver version");
}

const cargoPath = resolve("src-tauri/Cargo.toml");
const cargo = await readFile(cargoPath, "utf8");
const versionLine = /^version = "[^"]+"$/m;
if (!versionLine.test(cargo)) throw new Error("src-tauri/Cargo.toml has no package version");
await writeFile(cargoPath, cargo.replace(versionLine, `version = "${packageJson.version}"`));
