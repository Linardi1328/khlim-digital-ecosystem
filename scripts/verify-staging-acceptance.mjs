const required = [
  "KHLIM_STAGING_WEB_URL",
  "KHLIM_STAGING_API_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "BILLPLZ_SECRET_KEY",
  "BILLPLZ_COLLECTION_ID",
  "BILLPLZ_X_SIGNATURE_KEY",
];

function fail(message) {
  console.error(`staging.acceptance.failed: ${message}`);
  process.exitCode = 1;
}

function requiredValue(name) {
  const value = process.env[name]?.trim();
  if (!value || /replace-with|example|placeholder/i.test(value)) {
    throw new Error(`${name} is missing or still a placeholder`);
  }
  return value;
}

function requireHttps(name, value) {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS for staging acceptance`);
  }
  if (["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`${name} must point to a deployed staging service`);
  }
  return url;
}

async function fetchOk(label, url, init) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    ...init,
  });
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  return response;
}

async function main() {
  for (const name of required) requiredValue(name);
  if (process.env.BILLPLZ_SANDBOX !== "1") {
    throw new Error(
      "BILLPLZ_SANDBOX must be 1; staging acceptance refuses production payments",
    );
  }
  if (process.env.PAYMENT_PROVIDER !== "billplz") {
    throw new Error(
      "PAYMENT_PROVIDER must be billplz in the staging acceptance environment",
    );
  }

  const web = requireHttps(
    "KHLIM_STAGING_WEB_URL",
    requiredValue("KHLIM_STAGING_WEB_URL"),
  );
  const api = requireHttps(
    "KHLIM_STAGING_API_URL",
    requiredValue("KHLIM_STAGING_API_URL"),
  );
  const supabase = requireHttps(
    "NEXT_PUBLIC_SUPABASE_URL",
    requiredValue("NEXT_PUBLIC_SUPABASE_URL"),
  );

  await fetchOk("KHLIM staging web", web);
  const healthUrl = new URL("/v1/health", api);
  const health = await fetchOk("KHLIM staging API health", healthUrl);
  const healthJson = await health.json().catch(() => null);
  if (!healthJson || healthJson.status !== "ok") {
    throw new Error("KHLIM staging API health did not return { status: 'ok' }");
  }

  const supabaseHealth = new URL("/auth/v1/health", supabase);
  await fetchOk("Supabase Auth staging health", supabaseHealth, {
    headers: { apikey: requiredValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
  });

  console.log(
    JSON.stringify({
      event: "staging.acceptance.ready",
      webHost: web.host,
      apiHost: api.host,
      supabaseHost: supabase.host,
      paymentProvider: "billplz",
      billplzSandbox: true,
      note: "Provider credentials were validated for presence only; no money-moving request was made.",
    }),
  );
}

main().catch((error) =>
  fail(error instanceof Error ? error.message : String(error)),
);
