import path from "node:path";
import fs from "node:fs";
import { STAGED_MEDIA_ASSETS } from "../../../../lib/media-registry";

function findStagingPackDir(): string | null {
  const envDir = process.env.STAGING_MEDIA_PACK_DIR;
  if (envDir && fs.existsSync(/*turbopackIgnore: true*/ envDir)) {
    return envDir;
  }

  const candidates = [
    path.join(process.cwd(), "docs/media/staging-pack"),
    path.join(process.cwd(), "../..", "docs/media/staging-pack"),
    path.join(process.cwd(), "..", "docs/media/staging-pack"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  // Security Gate 1: Fail closed in production.
  // Private staging assets awaiting rights approval must never be served in production builds.
  if (process.env.NODE_ENV === "production") {
    return new Response("Forbidden in production", { status: 403 });
  }

  const { path: pathSegments } = await context.params;

  if (!pathSegments || pathSegments.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  // Security Gate 2: Path Traversal Prevention
  for (const segment of pathSegments) {
    if (
      segment.includes("..") ||
      segment.includes("/") ||
      segment.includes("\\") ||
      segment.startsWith(".")
    ) {
      return new Response("Bad Request", { status: 400 });
    }
  }

  const relativePath = pathSegments.join("/");

  // Security Gate 3: Allowlist enforcement against registered staging assets
  const matchedAsset = STAGED_MEDIA_ASSETS.find(
    (asset) => asset.file === relativePath,
  );

  if (!matchedAsset) {
    return new Response("Not Found in staging registry", { status: 404 });
  }

  const stagingDir = findStagingPackDir();
  if (!stagingDir) {
    return new Response("Staging pack directory not located", {
      status: 404,
    });
  }

  const absoluteFilePath = path.join(stagingDir, relativePath);

  // Security Gate 4: Resolve and ensure within stagingDir
  const normalizedPath = path.normalize(absoluteFilePath);
  if (!normalizedPath.startsWith(path.normalize(stagingDir))) {
    return new Response("Access Denied", { status: 403 });
  }

  if (!fs.existsSync(/*turbopackIgnore: true*/ normalizedPath)) {
    return new Response("Asset file not found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(
      /*turbopackIgnore: true*/ normalizedPath,
    );
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store, must-revalidate",
        "X-Media-Rights-Status": matchedAsset.rightsStatus,
        "X-Public-Ready": "false",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
