import type { NextConfig } from "next";

const isManagedNextHost = Boolean(process.env.VERCEL || process.env.NETLIFY);

const nextConfig: NextConfig = {
  output: isManagedNextHost ? undefined : "standalone",
  reactStrictMode: true,
};

export default nextConfig;
