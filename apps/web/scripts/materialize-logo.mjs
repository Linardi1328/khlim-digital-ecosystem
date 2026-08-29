import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const sourcePath = resolve(appRoot, "public", "khlim-logo.svg");
const targetPath = resolve(appRoot, "public", "khlim-logo.webp");

const svg = await readFile(sourcePath, "utf8");
const match = svg.match(/href=["']data:image\/webp;base64,([^"']+)["']/i);

if (!match) {
  throw new Error(
    "KHLIM logo source does not contain the expected embedded WebP payload.",
  );
}

const payload = match[1].replace(/\s+/g, "");
const bytes = Buffer.from(payload, "base64");
const riff = bytes.subarray(0, 4).toString("ascii");
const webp = bytes.subarray(8, 12).toString("ascii");

if (bytes.length < 12 || riff !== "RIFF" || webp !== "WEBP") {
  throw new Error("KHLIM logo payload is not a valid WebP file.");
}

await writeFile(targetPath, bytes);
console.log(`Materialized ${targetPath} (${bytes.length} bytes)`);
