import assert from "node:assert/strict";
import { test } from "node:test";

const { GET } = await import(
  new URL("../apps/web/app/api/editorial/[...segments]/route.ts", import.meta.url)
    .href
);

test("protected preview proxies only approved editorial GETs with server OIDC", async () => {
  const previousEnv = {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  const originalFetch = globalThis.fetch;
  const requests = [];

  process.env.NEXT_PUBLIC_API_BASE_URL =
    "https://example-staging-api.vercel.app/v1";
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "preview";
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return Response.json([
      {
        id: "a",
        photoRightsVerified: false,
        imageUrl: null,
        factsVerified: true,
      },
    ]);
  };

  async function call(segments, includeToken = true) {
    return GET(
      new Request("https://example-web.vercel.app/api/editorial", {
        headers: includeToken ? { "x-vercel-oidc-token": "test-oidc" } : {},
      }),
      { params: Promise.resolve({ segments }) },
    );
  }

  try {
    const approved = await call(["achievements"]);
    assert.equal(approved.status, 200);
    assert.match(approved.headers.get("cache-control"), /no-store/);
    assert.deepEqual(await approved.json(), [
      {
        id: "a",
        photoRightsVerified: false,
        imageUrl: null,
        factsVerified: true,
      },
    ]);
    assert.equal(requests.length, 1);
    assert.equal(
      requests[0].url,
      "https://example-staging-api.vercel.app/v1/editorial/achievements",
    );
    assert.equal(
      requests[0].options.headers["x-vercel-trusted-oidc-idp-token"],
      "test-oidc",
    );
    assert.equal(requests[0].options.redirect, "manual");

    const disallowed = await call(["admin"]);
    assert.equal(disallowed.status, 404);
    assert.equal(requests.length, 1);

    const unauthenticated = await call(["player-spotlights"], false);
    assert.equal(unauthenticated.status, 503);
    assert.equal(requests.length, 1);

    globalThis.fetch = async () =>
      new Response("<html>Vercel Authentication</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    const loginPage = await call(["player-spotlights"]);
    assert.equal(loginPage.status, 503);

    globalThis.fetch = async () => Response.json({ bad: "shape" });
    const invalidCollection = await call(["achievements"]);
    assert.equal(invalidCollection.status, 503);

    globalThis.fetch = async () =>
      new Response("Forbidden", { status: 403 });
    const denied = await call(["achievements"]);
    assert.equal(denied.status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
});
