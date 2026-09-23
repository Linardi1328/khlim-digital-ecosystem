import type { NextConfig } from "next";

const isCloudflarePages = process.env.CLOUDFLARE_PAGES === "1";

function allowedConnectSources(): string[] {
  const sources = new Set(["'self'"]);

  for (const candidate of [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ]) {
    if (!candidate) continue;
    try {
      sources.add(new URL(candidate).origin);
    } catch {
      // Runtime configuration validation reports malformed URLs separately.
    }
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    sources.add("https://*.sentry.io");
  }

  return [...sources];
}

function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${allowedConnectSources().join(" ")}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const standardNextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  images: isCloudflarePages ? { unoptimized: true } : undefined,
  trailingSlash: isCloudflarePages,
  reactStrictMode: true,
  headers: isCloudflarePages
    ? undefined
    : async () => [{ source: "/(.*)", headers: securityHeaders }],
};

const nextConfig: NextConfig = isCloudflarePages
  ? { ...standardNextConfig, output: "export" }
  : standardNextConfig;

export default nextConfig;
