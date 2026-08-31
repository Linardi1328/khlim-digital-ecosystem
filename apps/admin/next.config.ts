import type { NextConfig } from "next";

const isCloudflarePages = process.env.CLOUDFLARE_PAGES === "1";

const nextConfig: NextConfig = {
  output: process.env.VERCEL
    ? undefined
    : isCloudflarePages
      ? "export"
      : "standalone",
  images: isCloudflarePages ? { unoptimized: true } : undefined,
  trailingSlash: isCloudflarePages,
  reactStrictMode: true,
};

export default nextConfig;
