import type { NextConfig } from "next";

const isCloudflarePages = process.env.CLOUDFLARE_PAGES === "1";

const standardNextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  images: isCloudflarePages ? { unoptimized: true } : undefined,
  trailingSlash: isCloudflarePages,
  reactStrictMode: true,
};

const nextConfig: NextConfig = isCloudflarePages
  ? { ...standardNextConfig, output: "export" }
  : standardNextConfig;

export default nextConfig;
