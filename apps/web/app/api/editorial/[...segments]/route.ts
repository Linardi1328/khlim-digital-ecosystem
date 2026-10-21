/**
 * Same-origin read-only editorial proxy for the protected KHLIM preview.
 *
 * The staging API remains behind Vercel Authentication. On Vercel, the platform
 * provides a short-lived OIDC token on the function request; forwarding it from
 * the server avoids exposing credentials or disabling protection in the browser.
 * This route does not supply fallback articles or override publication rights.
 */
const ALLOWED_COLLECTIONS = new Set(["achievements", "player-spotlights"]);
const CACHE_HEADERS = { "Cache-Control": "private, no-store" };

function unavailable(): Response {
  return Response.json(
    { error: "Editorial service currently unavailable" },
    { status: 503, headers: CACHE_HEADERS },
  );
}

function isValidRoute(segments: string[]): boolean {
  if (segments.length === 1) {
    return ALLOWED_COLLECTIONS.has(segments[0]);
  }
  return (
    segments.length === 2 &&
    segments[0] === "player-spotlights" &&
    /^[a-z0-9-]{1,128}$/i.test(segments[1])
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ segments: string[] }> },
): Promise<Response> {
  const { segments } = await params;
  if (!isValidRoute(segments)) {
    return new Response("Not Found", { status: 404, headers: CACHE_HEADERS });
  }

  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configuredBase) return unavailable();

  let base: URL;
  try {
    base = new URL(configuredBase.replace(/\/+$/, "") + "/");
  } catch {
    return unavailable();
  }
  if (process.env.VERCEL && base.protocol !== "https:") {
    return unavailable();
  }

  const oidc = request.headers.get("x-vercel-oidc-token");
  if (process.env.VERCEL_ENV === "preview" && !oidc) {
    // Do not bypass Vercel Authentication to make a preview appear healthy.
    return unavailable();
  }

  const path = segments.map(encodeURIComponent).join("/");
  const upstreamUrl = new URL(`editorial/${path}`, base);
  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        ...(oidc ? { "x-vercel-trusted-oidc-idp-token": oidc } : {}),
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404 && segments.length === 2) {
      return new Response("Not Found", { status: 404, headers: CACHE_HEADERS });
    }
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
      return unavailable();
    }

    const data: unknown = await response.json();
    const valid = segments.length === 1
      ? Array.isArray(data)
      : data !== null && typeof data === "object" && !Array.isArray(data);
    if (!valid) return unavailable();

    return Response.json(data, { status: 200, headers: CACHE_HEADERS });
  } catch {
    return unavailable();
  }
}
