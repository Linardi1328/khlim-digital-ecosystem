import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

const isManagedNextHost = Boolean(process.env.VERCEL || process.env.NETLIFY);
const publicDir = resolve(process.cwd(), "public");
const logoSourcePath = resolve(publicDir, "khlim-logo.svg");
const logoTargetPath = resolve(publicDir, "khlim-logo.webp");

function ensureBrowserSafeLogo() {
  const sourceMtime = statSync(logoSourcePath).mtimeMs;
  const targetIsFresh =
    existsSync(logoTargetPath) &&
    statSync(logoTargetPath).mtimeMs >= sourceMtime;

  if (targetIsFresh) return;

  const svg = readFileSync(logoSourcePath, "utf8");
  const match = svg.match(/href=["']data:image\/webp;base64,([^"']+)["']/i);

  if (!match) {
    throw new Error(
      "KHLIM logo source does not contain the expected embedded WebP payload.",
    );
  }

  const bytes = Buffer.from(match[1].replace(/\s+/g, ""), "base64");
  const riff = bytes.subarray(0, 4).toString("ascii");
  const webp = bytes.subarray(8, 12).toString("ascii");

  if (bytes.length < 12 || riff !== "RIFF" || webp !== "WEBP") {
    throw new Error("KHLIM logo payload is not a valid WebP file.");
  }

  writeFileSync(logoTargetPath, bytes);
}

ensureBrowserSafeLogo();

const nextConfig: NextConfig = {
  output: isManagedNextHost ? undefined : "standalone",
  reactStrictMode: true,
};

export default nextConfig;
