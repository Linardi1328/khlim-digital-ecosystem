import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { STAGED_MEDIA_ASSETS } from "../../../../lib/media-registry";
import {
  isAllowedRecoveredVisualReviewPath,
  isLoopbackHostHeader,
  isLoopbackHostname,
} from "../../../../lib/local-visual-review-media";

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

function findRecoveredMediaDir(): string | null {
  const envDir = process.env.KHLIM_PRIVATE_MEDIA_RECOVERY_DIR?.trim();
  if (envDir && fs.existsSync(/*turbopackIgnore: true*/ envDir)) {
    return envDir;
  }

  const defaultDir = path.join(
    os.homedir(),
    "KHLIM-Private-Media-Recovery",
    "apps",
    "web",
    "public",
    "media",
  );
  if (fs.existsSync(/*turbopackIgnore: true*/ defaultDir)) {
    return defaultDir;
  }

  return null;
}

function isLoopbackRequest(request: Request): boolean {
  try {
    const parsedUrl = new URL(request.url);
    if (!isLoopbackHostname(parsedUrl.hostname)) {
      return false;
    }
  } catch {
    return false;
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader !== null && !isLoopbackHostHeader(hostHeader)) {
    return false;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost !== null) {
    const forwardedHosts = forwardedHost
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (
      forwardedHosts.length === 0 ||
      forwardedHosts.some((entry) => !isLoopbackHostHeader(entry))
    ) {
      return false;
    }
  }

  return true;
}

function resolveContainedRealPath(
  rootDir: string,
  relativePath: string,
):
  | { status: "ok"; filePath: string }
  | { status: "not_found" }
  | { status: "forbidden" } {
  const resolvedRoot = fs.realpathSync(/*turbopackIgnore: true*/ rootDir);
  const candidatePath = path.resolve(resolvedRoot, relativePath);
  const rootPrefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : `${resolvedRoot}${path.sep}`;

  if (!candidatePath.startsWith(rootPrefix)) {
    return { status: "forbidden" };
  }

  if (!fs.existsSync(/*turbopackIgnore: true*/ candidatePath)) {
    return { status: "not_found" };
  }

  const realFilePath = fs.realpathSync(/*turbopackIgnore: true*/ candidatePath);
  if (!realFilePath.startsWith(rootPrefix)) {
    return { status: "forbidden" };
  }

  return { status: "ok", filePath: realFilePath };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  // Security Gate 1: Fail closed in production and hosted deployments.
  // Private staging and recovered assets awaiting rights approval must never be
  // served in production builds or hosted environments.
  if (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV)
  ) {
    return new Response("Forbidden in production", { status: 403 });
  }

  // Security Gate 1b: Restrict strictly to loopback hosts.
  if (!isLoopbackRequest(request)) {
    return new Response("Forbidden outside loopback", { status: 403 });
  }

  const { path: pathSegments } = await context.params;

  if (!pathSegments || pathSegments.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  // Security Gate 2: Path Traversal Prevention
  for (const segment of pathSegments) {
    if (
      !segment ||
      segment.includes("..") ||
      segment.includes("/") ||
      segment.includes("\\") ||
      segment.startsWith(".")
    ) {
      return new Response("Bad Request", { status: 400 });
    }
  }

  // Namespace A: Explicitly enabled localhost-only visual review of recovered
  // historical originals stored outside the repository.
  if (pathSegments[0] === "recovered") {
    if (process.env.KHLIM_LOCAL_VISUAL_REVIEW !== "1") {
      return new Response("Local visual review not enabled", { status: 403 });
    }

    const recoveredRelativePath = pathSegments.slice(1).join("/");
    if (!isAllowedRecoveredVisualReviewPath(recoveredRelativePath)) {
      return new Response("Not Found in visual review allowlist", {
        status: 404,
      });
    }

    const recoveryDir = findRecoveredMediaDir();
    if (!recoveryDir) {
      return new Response("Private media recovery directory not located", {
        status: 404,
      });
    }

    const resolved = resolveContainedRealPath(
      recoveryDir,
      recoveredRelativePath,
    );
    if (resolved.status === "forbidden") {
      return new Response("Access Denied", { status: 403 });
    }
    if (resolved.status === "not_found") {
      return new Response("Asset file not found", { status: 404 });
    }

    try {
      const fileBuffer = fs.readFileSync(
        /*turbopackIgnore: true*/ resolved.filePath,
      );
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, no-store, must-revalidate",
          "X-Robots-Tag": "noindex, nofollow, noimageindex",
          "X-Media-Rights-Status": "GUARDIAN_AND_PHOTOGRAPHER_CONSENT_REQUIRED",
          "X-Public-Ready": "false",
          "X-Local-Visual-Review": "true",
        },
      });
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Namespace B: Existing staging-pack review assets
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

  // Security Gate 4: Resolve real path and ensure containment within stagingDir
  const resolved = resolveContainedRealPath(stagingDir, relativePath);
  if (resolved.status === "forbidden") {
    return new Response("Access Denied", { status: 403 });
  }
  if (resolved.status === "not_found") {
    return new Response("Asset file not found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(
      /*turbopackIgnore: true*/ resolved.filePath,
    );
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store, must-revalidate",
        "X-Robots-Tag": "noindex, nofollow, noimageindex",
        "X-Media-Rights-Status": matchedAsset.rightsStatus,
        "X-Public-Ready": "false",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
